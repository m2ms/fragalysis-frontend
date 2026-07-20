import ViewerAdapter from './ViewerAdapter';
import {
  MoorhenMap,
  MoorhenMolecule,
  MoorhenReduxStore,
  addMap,
  addMolecule,
  addVector,
  hideMap,
  hideMolecule,
  removeMap,
  removeMolecule,
  removeVector,
  setActiveMap,
  setBackgroundColor,
  setClipEnd,
  setClipStart,
  setContourLevel,
  setFogEnd,
  setFogStart,
  setMapAlpha,
  setMapColours,
  setMapRadius,
  setMapStyle,
  setNegativeMapColours,
  setOrigin,
  setPositiveMapColours,
  setQuat,
  setZoom,
  setZoomWheelSensitivityFactor,
  showMap,
  showMolecule
} from 'moorhen';
import {
  createMoorhenVector,
  createSpherePdb,
  getMoorhenRepresentationStyle,
  getMoorhenRepresentationTemplate,
  nglSelectionToMoorhenCid,
  normaliseMoorhenColour,
  normaliseMoorhenOrientation
} from './moorhenAdapterUtils';

const STRUCTURE_OBJECT_TYPES = new Set(['PROTEIN', 'SURFACE']);
const VECTOR_OBJECT_TYPES = new Set(['ARROW', 'CYLINDER']);
const LIGAND_FOCUS_ZOOM_SCALE = 1.8;
const MOORHEN_FULL_MOLECULE_ZOOM_DIVISOR = 40;
const MOORHEN_SELECTION_ZOOM = 0.4;
const ZOOM_WHEEL_SENSITIVITY = 8;

const isFileLike = source => source && typeof source === 'object' && typeof source.name === 'string';
const isMolfileData = source =>
  typeof source === 'string' && /(?:V2000|V3000)/.test(source) && /(?:^|\r?\n)M {2}END[ \t]*(?:\r?\n|$)/.test(source);
const isUrl = source =>
  typeof source === 'string' &&
  !source.includes('\n') &&
  !source.includes('\r') &&
  !source.trimStart().startsWith('data_') &&
  !source.trimStart().startsWith('ATOM') &&
  !source.trimStart().startsWith('HETATM');

const getPdbRecordName = line => line.slice(0, 6).trim();
const getPdbResidueName = line =>
  line
    .slice(17, 20)
    .trim()
    .toUpperCase();
const getPdbAtomSerial = line => line.slice(6, 11).trim();

export const stripPdbLigandRecords = pdbData => {
  const lines = String(pdbData || '').split(/\r?\n/);
  const ligandSerials = new Set(
    lines
      .filter(line => ['ATOM', 'HETATM', 'ANISOU'].includes(getPdbRecordName(line)))
      .filter(line => getPdbResidueName(line) === 'LIG')
      .map(getPdbAtomSerial)
      .filter(Boolean)
  );

  if (ligandSerials.size === 0) return String(pdbData || '');

  return lines
    .filter(line => {
      const recordName = getPdbRecordName(line);
      if (
        ['ATOM', 'HETATM', 'ANISOU'].includes(recordName) &&
        (getPdbResidueName(line) === 'LIG' || ligandSerials.has(getPdbAtomSerial(line)))
      ) {
        return false;
      }
      if (recordName === 'LINK') {
        return (
          line
            .slice(17, 20)
            .trim()
            .toUpperCase() !== 'LIG' &&
          line
            .slice(47, 50)
            .trim()
            .toUpperCase() !== 'LIG'
        );
      }
      if (recordName === 'CONECT') {
        const connectedSerials = line.slice(6).match(/\d+/g) || [];
        return !connectedSerials.some(serial => ligandSerials.has(serial));
      }
      return true;
    })
    .join('\n');
};

const getObjectName = (source, options, fallback) => options?.name || source?.name || fallback;

const getRepresentationDefinition = (representation, fallbackType, fallbackParameters = {}) => ({
  type: representation?.type || fallbackType,
  params: { ...fallbackParameters, ...(representation?.params || {}) },
  lastKnownID: representation?.lastKnownID
});

const mapParametersForTarget = (target, mapKind) => {
  const suffix = mapKind === 'event' ? 'DENSITY' : `DENSITY_MAP_${mapKind}`;
  return {
    visible: true,
    color: target[`color_${suffix}`],
    colorValue: normaliseMoorhenColour(target[`color_${suffix}`], mapKind === 'event' ? '#ffa500' : '#0000ff').integer,
    isolevel: target[`isolevel_${suffix}`],
    boxSize: target[`boxSize_${suffix}`],
    opacity: target[`opacity_${suffix}`],
    contour: target[`contour_${suffix}`]
  };
};

export class MoorhenViewerAdapter extends ViewerAdapter {
  constructor({
    commandCentre,
    glRef,
    store = MoorhenReduxStore,
    monomerLibraryPath = './monomers',
    containerElement = null
  } = {}) {
    super();

    if (!commandCentre || !glRef || !store) {
      throw new TypeError('MoorhenViewerAdapter requires commandCentre, glRef and store');
    }

    this.commandCentre = commandCentre;
    this.glRef = glRef;
    this.store = store;
    this.monomerLibraryPath = monomerLibraryPath;
    this.containerElement = containerElement;
    this.objectsByName = new Map();
    this.representationsByObject = new WeakMap();
    this.centerZoomScaleByObject = new WeakMap();
    this.pickHandlers = new Map();
    this.clickHandlers = new Map();
    this.orientationHandlers = new Map();
    this.taskCompletionHandlers = new Set();
    this.focusRequestSequence = 0;
    this.destroyed = false;
    this.runtime = { commandCentre, glRef, store, containerElement, viewerAdapter: this };
    this.store.dispatch(setBackgroundColor([0, 0, 0, 1]));
    this.store.dispatch(setZoomWheelSensitivityFactor(ZOOM_WHEEL_SENSITIVITY));
  }

  getNativeViewer() {
    return this.runtime;
  }

  assertActive() {
    if (this.destroyed) {
      throw new Error('MoorhenViewerAdapter has been destroyed');
    }
    if (!this.commandCentre.current || !this.glRef.current) {
      throw new Error('Moorhen runtime is not ready');
    }
  }

  registerObject(object, requestedName, representations = []) {
    const name = requestedName || object.name || `${object.type}-${object.molNo}`;
    object.name = name;
    this.objectsByName.set(name, object);

    const handles = Array.isArray(representations) ? representations : [representations].filter(Boolean);
    this.representationsByObject.set(object, handles);
    return object;
  }

  createRepresentationHandle(object, nativeRepresentation, type, parameters = {}, lastKnownID) {
    const representationType = type || nativeRepresentation?.style || 'CRs';
    const uuid =
      nativeRepresentation?.uniqueId ||
      `${object.uniqueId || object.molNo || object.name}-${representationType}-${
        this.getRepresentations(object).length
      }`;
    const colourValue = parameters.colorValue ?? parameters.color;
    const params = { visible: true, opacity: 1, ...parameters };
    if (colourValue != null) {
      params.colorValue = normaliseMoorhenColour(colourValue, '#ffffff').integer;
    }

    return {
      uuid,
      lastKnownID: lastKnownID || uuid,
      type: representationType,
      params,
      parameters: params,
      templateParams: getMoorhenRepresentationTemplate(representationType, object.type === 'map'),
      visible: params.visible !== false && nativeRepresentation?.visible !== false,
      nativeRepresentation,
      parentObject: object,
      ready: Promise.resolve(nativeRepresentation)
    };
  }

  async loadObject(options) {
    const target = options?.target || options?.input_dict;
    const objectType = target?.OBJECT_TYPE;

    if (STRUCTURE_OBJECT_TYPES.has(objectType)) {
      const source = target.prot_url;
      const representation = objectType === 'SURFACE' ? 'surface' : target.nglProtStyle || 'cartoon';
      const defaultRepresentations =
        objectType === 'SURFACE'
          ? [
              {
                type: 'surface',
                params: { sele: 'polymer', color: target.colour, opacity: 0.74, visible: true }
              }
            ]
          : undefined;
      const molecule = await this.loadMolecule(source, {
        name: options.object_name || target.name,
        representation,
        representations: options.representations || defaultRepresentations,
        color: target.colour,
        center: options.center
      });
      return this.getRepresentations(molecule);
    }

    if (objectType === 'HIT_PROTEIN' || objectType === 'ARTEFACTS') {
      const linewidth = objectType === 'ARTEFACTS' ? 1.2 : 2.4;
      const source = objectType === 'ARTEFACTS' ? target.artefacts_url : target.prot_url;
      const pdbData = await this.getPdbWithoutLigand(source, options.fetchOptions);
      const molecule = await this.loadMolecule(pdbData, {
        name: options.object_name || target.name,
        fromString: true,
        representation: 'line',
        representations: options.representations || [
          {
            type: 'line',
            params: { color: target.colour, visible: true, sele: '/0', linewidth }
          }
        ],
        color: target.colour,
        center: options.center === true
      });
      return this.getRepresentations(molecule);
    }

    if (objectType === 'LIGAND') {
      const defaultRepresentations = [
        {
          type: options.markAsRightSideLigand ? 'licorice' : 'ball+stick',
          params: {
            color: target.colour,
            colorScheme: 'element',
            multipleBond: true,
            radiusSize: options.markAsRightSideLigand ? 0.11 : 0.22,
            radiusScale: options.markAsRightSideLigand ? undefined : 1.35,
            visible: true
          }
        }
      ];
      const molecule = await this.loadMolecule(target.sdf_info, {
        name: options.object_name || target.name,
        fromString: true,
        representation: options.markAsRightSideLigand ? 'licorice' : 'ball+stick',
        representations: options.representations || defaultRepresentations,
        color: target.colour,
        center: options.center === true,
        centerZoomScale: LIGAND_FOCUS_ZOOM_SCALE
      });
      return this.getRepresentations(molecule);
    }

    if (objectType === 'COMPLEX') {
      const molecule = await this.loadComplex(target, options);
      return this.getRepresentations(molecule);
    }

    if (objectType === 'DENSITY') {
      const mapRequests = [
        target.render_sigmaa && target.sigmaa_url
          ? {
              source: target.sigmaa_url,
              name: `${target.name}_MAP_sigmaa`,
              isDifference: false,
              parameters: mapParametersForTarget(target, 'sigmaa')
            }
          : null,
        target.render_diff && target.diff_url
          ? {
              source: target.diff_url,
              name: `${target.name}_MAP_diff`,
              isDifference: true,
              parameters: {
                ...mapParametersForTarget(target, 'diff'),
                negativeColor: target.color_DENSITY_MAP_diff_negate
              }
            }
          : null,
        target.render_event && target.event_url
          ? {
              source: target.event_url,
              name: target.name,
              isDifference: false,
              parameters: mapParametersForTarget(target, 'event')
            }
          : null
      ].filter(Boolean);
      const mapResults = await Promise.allSettled(
        mapRequests.map(request => this.loadMap(request.source, { ...request, ext: 'map' }))
      );
      const failedMap = mapResults.find(result => result.status === 'rejected');
      if (failedMap) {
        await Promise.all(
          mapResults.filter(result => result.status === 'fulfilled').map(result => this.removeObject(result.value))
        );
        throw failedMap.reason;
      }
      const maps = mapResults.map(result => result.value);

      return maps.map(map => ({ name: map.name, repr: this.getRepresentations(map) }));
    }

    if (VECTOR_OBJECT_TYPES.has(objectType)) {
      const vector = this.loadVector(
        createMoorhenVector({
          name: options.object_name || target.name,
          start: target.start,
          end: target.end,
          colour: target.colour || target.color,
          arrow: objectType === 'ARROW'
        })
      );
      return this.getRepresentations(vector);
    }

    if (objectType === 'SPHERE') {
      const sphere = await this.addSphere({
        name: options.object_name || target.name,
        center: target.coords,
        color: target.colour,
        radius: target.radius
      });
      return this.getRepresentations(sphere);
    }

    if (objectType === 'EVENTMAP') {
      const moleculeRepresentations = [
        { type: 'cartoon', params: { visible: true } },
        { type: 'contact', params: { sele: 'LIG', linewidth: 1, visible: true } },
        { type: 'ball+stick', params: { sele: 'LIG', multipleBond: true, visible: true } }
      ];
      const molecule = await this.loadMolecule(target.pdb_info, {
        name: options.object_name || target.name,
        fromString: true,
        representation: 'cartoon',
        representations: moleculeRepresentations,
        center: options.center
      });
      let map;
      try {
        map = await this.loadMap(target.map_info, {
          name: `${target.name}_EVENT_MAP`,
          isDifference: true,
          parameters: { color: 'mediumseagreen', negativeColor: 'tomato', isolevel: 3, boxSize: 10 }
        });
      } catch (error) {
        await this.removeObject(molecule);
        throw error;
      }
      molecule.linkedObjects = [map];
      this.representationsByObject.set(molecule, [
        ...this.getRepresentations(molecule),
        ...this.getRepresentations(map)
      ]);
      return this.getRepresentations(molecule);
    }

    if (objectType === 'HOTSPOT') {
      const map = await this.loadMap(target.hotUrl, {
        name: options.object_name || target.name,
        parameters: {
          color: target.map_type === 'AP' ? 'yellow' : target.map_type === 'DO' ? 'blue' : 'red',
          isolevel: target.isoLevel,
          opacity: target.opacity
        }
      });
      return this.getRepresentations(map);
    }

    throw new Error(`Unsupported Moorhen object type: ${objectType || 'unknown'}`);
  }

  async getPdbWithoutLigand(source, fetchOptions) {
    if (!source) throw new Error('Moorhen protein source is required');

    let pdbData;
    if (isUrl(source)) {
      const response = await fetch(source, { credentials: 'same-origin', ...fetchOptions });
      if (!response.ok) throw new Error(`Unable to load protein coordinates from ${source} (${response.status})`);
      pdbData = await response.text();
    } else {
      pdbData = source && typeof source.text === 'function' ? await source.text() : source;
    }
    return stripPdbLigandRecords(pdbData);
  }

  async createNativeMolecule(source, name, options = {}) {
    const molecule = new MoorhenMolecule(this.commandCentre, this.glRef, this.store, this.monomerLibraryPath);
    const sceneSettings = this.store.getState().sceneSettings || {};

    if (sceneSettings.backgroundColor && typeof molecule.setBackgroundColour === 'function') {
      molecule.setBackgroundColour(sceneSettings.backgroundColor);
    }
    if (sceneSettings.defaultBondSmoothness != null && molecule.defaultBondOptions) {
      molecule.defaultBondOptions.smoothness = sceneSettings.defaultBondSmoothness;
    }

    if (isUrl(source) && options.fromString !== true) {
      await molecule.loadToCootFromURL(source, name, options.fetchOptions);
    } else if (isFileLike(source) && typeof molecule.loadToCootFromFile === 'function') {
      await molecule.loadToCootFromFile(source);
    } else {
      const data = source && typeof source.text === 'function' ? await source.text() : source;
      if (isMolfileData(data) && typeof molecule.loadToCootFromFile === 'function') {
        const molfileName = `${name.replace(/\.(?:mol|sdf)$/i, '')}.mol`;
        await molecule.loadToCootFromFile(new File([data], molfileName, { type: 'chemical/x-mdl-molfile' }));
      } else {
        await molecule.loadToCootFromString(data, name);
      }
    }

    if (molecule.molNo == null || molecule.molNo === -1) {
      throw new Error(`Moorhen failed to load molecule ${name}`);
    }
    return molecule;
  }

  async initialiseMoleculeRepresentation(component, handle) {
    const style = getMoorhenRepresentationStyle(handle.type);
    const cid = nglSelectionToMoorhenCid(handle.params.sele);
    const nativeRepresentation = await component.addRepresentation(style, cid);
    handle.nativeRepresentation = nativeRepresentation;
    handle.ready = Promise.resolve(nativeRepresentation);
    await this.applyMoleculeRepresentationParameters(handle, handle.params);
    return nativeRepresentation;
  }

  async loadMolecule(source, options = {}) {
    this.assertActive();
    if (!source) {
      throw new Error('Moorhen molecule source is required');
    }

    const focusRequestId = options.center === true ? ++this.focusRequestSequence : null;
    const name = getObjectName(source, options, `molecule-${this.objectsByName.size + 1}`);
    const existingObject = this.getObject(name);
    if (existingObject) {
      await this.removeObject(existingObject);
    }

    const molecule = await this.createNativeMolecule(source, name, options);
    this.store.dispatch(addMolecule(molecule));
    this.store.dispatch(showMolecule(molecule));
    const registeredMolecule = this.registerObject(molecule, name);
    const centerZoomScale = Number(options.centerZoomScale);
    if (Number.isFinite(centerZoomScale) && centerZoomScale > 0) {
      this.centerZoomScaleByObject.set(registeredMolecule, centerZoomScale);
    }
    try {
      const definitions =
        options.representations?.length > 0
          ? options.representations
          : [
              getRepresentationDefinition(null, options.representation || 'cartoon', {
                color: options.color,
                visible: true
              })
            ];
      const handles = [];

      for (const definition of definitions) {
        const representation = getRepresentationDefinition(
          definition,
          options.representation || 'cartoon',
          options.color ? { color: options.color } : {}
        );
        const handle = this.createRepresentationHandle(
          registeredMolecule,
          null,
          representation.type,
          representation.params,
          representation.lastKnownID
        );
        handles.push(handle);
        this.representationsByObject.set(registeredMolecule, handles);
        await this.initialiseMoleculeRepresentation(registeredMolecule, handle);
      }

      if (focusRequestId === this.focusRequestSequence) {
        await this.centerOn(registeredMolecule, options.selection);
      }
      return registeredMolecule;
    } catch (error) {
      await this.removeObject(registeredMolecule);
      throw error;
    }
  }

  async loadComplex(target, options = {}) {
    return this.loadProteinLigandComposite(target, options, {
      source: target.prot_url,
      fallbackType: 'contact',
      fallbackParameters: { color: target.colour, visible: true },
      centerSelection: '/*/*/(LIG)/*'
    });
  }

  async loadProteinLigandComposite(
    target,
    options = {},
    { source = target.prot_url, fallbackType = 'line', fallbackParameters = {}, linewidth, centerSelection } = {}
  ) {
    this.assertActive();
    const name = options.object_name || target.name;
    const existingObject = this.getObject(name);
    if (existingObject) await this.removeObject(existingObject);

    const focusRequestId = options.center === true ? ++this.focusRequestSequence : null;
    const protein = await this.createNativeMolecule(source, name);
    let ligand;
    try {
      ligand = await this.createNativeMolecule(target.sdf_info, `${name}-ligand`, { fromString: true });
      await protein.mergeMolecules([ligand], false, false);
      await ligand.delete();
      ligand = null;
    } catch (error) {
      await Promise.allSettled([protein.delete(), ligand?.delete()]);
      throw error;
    }
    protein.name = name;
    this.store.dispatch(addMolecule(protein));
    this.store.dispatch(showMolecule(protein));
    this.registerObject(protein, name);

    try {
      const definitions =
        options.representations?.length > 0
          ? options.representations
          : [
              getRepresentationDefinition(null, fallbackType, {
                color: target.colour,
                visible: true,
                ...fallbackParameters,
                ...(linewidth == null ? {} : { sele: '/0', linewidth })
              })
            ];
      const handles = [];
      for (const definition of definitions) {
        const representation = getRepresentationDefinition(definition, fallbackType, {
          color: target.colour,
          ...fallbackParameters
        });
        const handle = this.createRepresentationHandle(
          protein,
          null,
          representation.type,
          representation.params,
          representation.lastKnownID
        );
        handles.push(handle);
        this.representationsByObject.set(protein, handles);
        await this.initialiseMoleculeRepresentation(protein, handle);
      }

      if (focusRequestId === this.focusRequestSequence) await this.centerOn(protein, centerSelection);
      return protein;
    } catch (error) {
      await this.removeObject(protein);
      throw error;
    }
  }

  async loadMap(source, options = {}) {
    this.assertActive();
    if (!source) {
      throw new Error('Moorhen map source is required');
    }

    const name = getObjectName(source, options, `map-${this.objectsByName.size + 1}`);
    const existingObject = this.getObject(name);
    if (existingObject) {
      await this.removeObject(existingObject);
    }
    const map = new MoorhenMap(this.commandCentre, this.glRef, this.store);
    const ext = (options.ext || '').toLowerCase();
    const isMtz = ext === 'mtz' || options.selectedColumns;

    if (isMtz && isFileLike(source) && (!options.selectedColumns || options.autoRead === true)) {
      const maps = await MoorhenMap.autoReadMtz(source, this.commandCentre, this.glRef, this.store);
      if (!maps.length) {
        throw new Error(`Moorhen failed to auto-read map ${name}`);
      }
      maps.forEach((loadedMap, index) => {
        this.store.dispatch(addMap(loadedMap));
        this.store.dispatch(showMap(loadedMap));
        if (index === 0) this.store.dispatch(setActiveMap(loadedMap));
        const mapName = loadedMap.name || `${name}-${index}`;
        const handle = this.createRepresentationHandle(
          loadedMap,
          null,
          'surface',
          options.parameters || {},
          options.lastKnownID
        );
        this.registerObject(loadedMap, mapName, [handle]);
        this.applyMapRepresentationParameters(handle, handle.params);
      });
      return maps[0];
    } else if (isUrl(source)) {
      if (isMtz) {
        await map.loadToCootFromMtzURL(source, name, options.selectedColumns, options.fetchOptions);
      } else {
        await map.loadToCootFromMapURL(
          source,
          name,
          options.isDifference === true,
          options.decompress === true,
          options.fetchOptions
        );
      }
    } else if (isFileLike(source)) {
      if (isMtz) {
        await map.loadToCootFromMtzFile(source, options.selectedColumns);
      } else {
        await map.loadToCootFromMapFile(source, options.isDifference === true, options.decompress === true);
      }
    } else {
      const sourceData = source && typeof source.arrayBuffer === 'function' ? await source.arrayBuffer() : source;
      const data = sourceData instanceof ArrayBuffer ? new Uint8Array(sourceData) : sourceData;
      if (isMtz) {
        await map.loadToCootFromMtzData(data, name, options.selectedColumns);
      } else {
        await map.loadToCootFromMapData(data, name, options.isDifference === true);
      }
    }

    if (map.molNo == null || map.molNo === -1) {
      throw new Error(`Moorhen failed to load map ${name}`);
    }

    this.store.dispatch(addMap(map));
    this.store.dispatch(showMap(map));
    this.store.dispatch(setActiveMap(map));
    const handle = this.createRepresentationHandle(map, null, 'surface', options.parameters || {}, options.lastKnownID);
    const registeredMap = this.registerObject(map, name, [handle]);
    this.applyMapRepresentationParameters(handle, handle.params);
    return registeredMap;
  }

  async applyMoleculeRepresentationParameters(handle, parameters = {}) {
    const nativeRepresentation = handle.nativeRepresentation || (await handle.ready);
    if (!nativeRepresentation) return handle;

    const opacity = Number(parameters.opacity);
    if (Number.isFinite(opacity) && typeof nativeRepresentation.setNonCustomOpacity === 'function') {
      nativeRepresentation.setNonCustomOpacity(Math.max(0, Math.min(1, opacity)));
    }

    const colourValue = parameters.colorValue ?? parameters.color;
    if (colourValue != null && typeof nativeRepresentation.addColourRule === 'function') {
      const colour = normaliseMoorhenColour(colourValue, '#ffffff');
      const cid = nglSelectionToMoorhenCid(parameters.sele);
      nativeRepresentation.setColourRules?.([]);
      nativeRepresentation.setUseDefaultColourRules?.(false);
      nativeRepresentation.addColourRule(
        'chain',
        cid,
        colour.hex,
        [cid, colour.hex],
        false,
        parameters.colorScheme !== 'element'
      );
      if (typeof nativeRepresentation.applyColourRules === 'function') {
        await nativeRepresentation.applyColourRules();
      }
    }

    const width = Number(parameters.radiusSize ?? parameters.radius ?? parameters.bondRadius);
    const lineWidth = Number(parameters.linewidth);
    if (
      (Number.isFinite(width) || Number.isFinite(lineWidth)) &&
      typeof nativeRepresentation.setBondOptions === 'function'
    ) {
      nativeRepresentation.setBondOptions({
        ...(nativeRepresentation.bondOptions || {}),
        width: Number.isFinite(width) ? width : Math.max(0.02, lineWidth * 0.05)
      });
    }

    if (typeof nativeRepresentation.setM2tParams === 'function') {
      const m2tParams = { ...(nativeRepresentation.m2tParams || {}) };
      let m2tChanged = false;
      const sphereRadius = Number(parameters.sphereRadius);
      const radiusMultiplier = Number(parameters.radiusScale ?? parameters.scale);
      const probeRadius = Number(parameters.probeRadius);
      if (Number.isFinite(sphereRadius)) {
        m2tParams.ballsStyleRadiusMultiplier = Math.max(0.01, sphereRadius / 1.7);
        m2tChanged = true;
      } else if (Number.isFinite(radiusMultiplier)) {
        m2tParams.ballsStyleRadiusMultiplier = Math.max(0.01, radiusMultiplier);
        m2tChanged = true;
      }
      if (Number.isFinite(probeRadius)) {
        m2tParams.surfaceStyleProbeRadius = Math.max(0.01, probeRadius);
        m2tChanged = true;
      }
      if (m2tChanged) nativeRepresentation.setM2tParams(m2tParams);
    }

    if (parameters.visible === false) {
      nativeRepresentation.hide?.();
    } else {
      await nativeRepresentation.show?.();
    }

    if (typeof nativeRepresentation.redraw === 'function') {
      await nativeRepresentation.redraw();
    }
    handle.visible = parameters.visible !== false;
    return handle;
  }

  applyMapRepresentationParameters(handle, parameters = {}) {
    const map = handle.parentObject;
    const molNo = map.molNo;
    const contourLevel = Number(parameters.isolevel);
    const radius = Number(parameters.boxSize ?? parameters.radius);
    const alpha = Number(parameters.opacity);

    if (Number.isFinite(contourLevel)) {
      this.store.dispatch(setContourLevel({ molNo, contourLevel: Math.abs(contourLevel) }));
    }
    if (Number.isFinite(radius) && radius > 0) {
      this.store.dispatch(setMapRadius({ molNo, radius }));
    }
    if (Number.isFinite(alpha)) {
      this.store.dispatch(setMapAlpha({ molNo, alpha: Math.max(0, Math.min(1, alpha)) }));
    }
    if (parameters.contour != null || parameters.wireframe != null) {
      const lines = parameters.contour ?? parameters.wireframe;
      this.store.dispatch(setMapStyle({ molNo, style: lines === false ? 'solid' : 'lines' }));
    }

    const colourValue = parameters.colorValue ?? parameters.color;
    if (colourValue != null) {
      const colour = normaliseMoorhenColour(colourValue, '#0000ff').rgb;
      this.store.dispatch(
        (map.isDifference || parameters.negativeColor != null ? setPositiveMapColours : setMapColours)({
          molNo,
          rgb: colour
        })
      );
    }
    if (parameters.negativeColor != null) {
      const colour = normaliseMoorhenColour(parameters.negativeColor, '#ff6347').rgb;
      this.store.dispatch(setNegativeMapColours({ molNo, rgb: colour }));
    }

    const visible = parameters.visible !== false && alpha !== 0;
    this.store.dispatch(visible ? showMap(map) : hideMap(map));
    handle.visible = visible;
    return handle;
  }

  async loadSurface(source, options = {}) {
    if (source?.type === 'molecule') {
      const representation = this.createRepresentation(source, 'surface', options.parameters || options);
      await representation.ready;
      return source;
    }
    return this.loadMolecule(source, { ...options, representation: 'surface' });
  }

  loadVector(vector, options = {}) {
    this.assertActive();
    if (!vector?.uniqueId) throw new Error('Moorhen vector requires a uniqueId');

    const name = options.name || vector.labelText || vector.uniqueId;
    const existingObject = this.getObject(name);
    if (existingObject?.type === 'vector') {
      this.store.dispatch(removeVector(existingObject.vector));
      this.objectsByName.delete(name);
      this.representationsByObject.delete(existingObject);
    }

    const object = {
      type: 'vector',
      name,
      uniqueId: vector.uniqueId,
      vector,
      visible: true
    };
    const handle = this.createRepresentationHandle(object, vector, 'buffer', options.parameters || {});
    this.store.dispatch(addVector(vector));
    return this.registerObject(object, name, [handle]);
  }

  async addSphere({ name, center, color, radius, representation = 'spacefill', representationParameters = {} }) {
    const molecule = await this.loadMolecule(createSpherePdb(center), {
      name,
      fromString: true,
      representation,
      color,
      center: false
    });
    molecule.shapeType = 'sphere';
    const handle = this.getRepresentations(molecule)[0];
    this.setRepresentationParameters(handle, {
      ...representationParameters,
      sphereRadius: Number(radius),
      colorValue: normaliseMoorhenColour(color, '#00ff00').integer
    });
    await handle.ready;
    return molecule;
  }

  setRepresentation(component, representation, parameters = {}) {
    return this.createRepresentation(component, representation, parameters);
  }

  async setVisibility(renderable, visible) {
    const representation = renderable?.parentObject ? renderable : null;
    const object = representation?.parentObject || renderable;

    if (object?.type === 'map') {
      this.store.dispatch(visible ? showMap(object) : hideMap(object));
    } else if (object?.type === 'molecule') {
      if (representation) {
        const nativeRepresentation = representation.nativeRepresentation || (await representation.ready);
        await (visible ? nativeRepresentation?.show?.() : nativeRepresentation?.hide?.());
      } else if (visible) {
        await Promise.all((object.representations || []).map(item => item.show()));
        this.store.dispatch(showMolecule(object));
      } else {
        (object.representations || []).forEach(item => item.hide());
        this.store.dispatch(hideMolecule(object));
      }
    } else if (object?.type === 'vector') {
      this.store.dispatch(visible ? addVector(object.vector) : removeVector(object.vector));
      object.visible = visible;
    }

    if (representation) {
      representation.visible = visible;
      representation.params.visible = visible;
      representation.parameters.visible = visible;
    }
    return visible;
  }

  getVisibility(renderable) {
    if (renderable?.parentObject) {
      return renderable.visible !== false;
    }
    if (renderable?.type === 'map') {
      return this.store.getState().mapContourSettings.visibleMaps.includes(renderable.molNo);
    }
    if (renderable?.type === 'molecule') {
      return typeof renderable.isVisible === 'function'
        ? renderable.isVisible()
        : this.store.getState().molecules.visibleMolecules.includes(renderable.molNo);
    }
    if (renderable?.type === 'vector') return renderable.visible !== false;
    return false;
  }

  createRepresentation(component, type, parameters = {}, lastKnownID) {
    const handle = this.createRepresentationHandle(component, null, type, parameters, lastKnownID);
    this.representationsByObject.set(component, [...this.getRepresentations(component), handle]);
    if (component?.type === 'molecule') {
      handle.ready = this.initialiseMoleculeRepresentation(component, handle).catch(error => {
        handle.error = error;
        this.representationsByObject.set(
          component,
          this.getRepresentations(component).filter(representation => representation !== handle)
        );
        throw error;
      });
    } else if (component?.type === 'map') {
      this.applyMapRepresentationParameters(handle, handle.params);
    }
    return handle;
  }

  getRepresentation(component, representation) {
    const found = this.getRepresentations(component).find(
      item => item.uuid === representation?.uuid || item.uuid === representation?.lastKnownID
    );
    if (found) return found;
    for (const object of this.objectsByName.values()) {
      const match = this.getRepresentations(object).find(
        item => item.uuid === representation?.uuid || item.uuid === representation?.lastKnownID
      );
      if (match) return match;
    }
    return undefined;
  }

  getRepresentations(component) {
    return this.representationsByObject.get(component) || [];
  }

  getRepresentationsByType(components, type) {
    return (components || []).flatMap(component =>
      this.getRepresentations(component).filter(representation => representation.type === type)
    );
  }

  getRepresentationCount(component) {
    return this.getRepresentations(component).length;
  }

  getRepresentationParameter(representation, key) {
    return representation?.parameters?.[key] ?? representation?.params?.[key];
  }

  setRepresentationParameters(representation, parameters) {
    const normalizedParameters = { ...parameters };
    if (parameters.color != null && parameters.colorValue == null) {
      normalizedParameters.colorValue = normaliseMoorhenColour(parameters.color, '#ffffff').integer;
    }
    const previousSelection = representation.params?.sele;
    representation.params = { ...representation.params, ...normalizedParameters };
    representation.parameters = { ...representation.parameters, ...normalizedParameters };
    if (representation.parentObject?.type === 'map') {
      this.applyMapRepresentationParameters(representation, representation.params);
    } else if (representation.parentObject?.type === 'molecule') {
      if (parameters.sele != null && parameters.sele !== previousSelection) {
        representation.nativeRepresentation?.deleteBuffers?.();
        representation.nativeRepresentation = null;
        representation.ready = this.initialiseMoleculeRepresentation(representation.parentObject, representation).catch(
          error => {
            representation.error = error;
            throw error;
          }
        );
      } else {
        representation.ready = Promise.resolve(representation.ready)
          .then(() => this.applyMoleculeRepresentationParameters(representation, representation.params))
          .then(() => representation.nativeRepresentation)
          .catch(error => {
            representation.error = error;
            throw error;
          });
      }
    }
    return representation;
  }

  removeRepresentation(component, representation) {
    const parentObject = representation.parentObject || component;
    if (parentObject?.type === 'map') {
      this.store.dispatch(hideMap(parentObject));
    } else {
      Promise.resolve(representation.ready).then(
        nativeRepresentation => nativeRepresentation?.deleteBuffers?.(),
        () => undefined
      );
    }
    for (const object of new Set([...this.objectsByName.values(), component, parentObject])) {
      if (!object) continue;
      this.representationsByObject.set(
        object,
        this.getRepresentations(object).filter(item => item !== representation)
      );
    }
  }

  getObject(name) {
    return this.objectsByName.get(name);
  }

  getObjects(name) {
    const object = this.getObject(name);
    return object ? [object] : [];
  }

  getObjectsByNameSuffix(suffix) {
    return Array.from(this.objectsByName.entries())
      .filter(([name]) => name.endsWith(suffix))
      .map(([, object]) => object);
  }

  async getFittedMoleculeZoom(component, selection) {
    if (selection !== '/*/*/*/*' && selection !== '//') return MOORHEN_SELECTION_ZOOM;

    let moleculeDiameter = Number(component.moleculeDiameter);
    if (!Number.isFinite(moleculeDiameter) && typeof component.getMoleculeDiameter === 'function') {
      moleculeDiameter = Number(await component.getMoleculeDiameter());
      component.moleculeDiameter = moleculeDiameter;
    }
    return Number.isFinite(moleculeDiameter) ? moleculeDiameter / MOORHEN_FULL_MOLECULE_ZOOM_DIVISOR : null;
  }

  async centerOn(component, selection) {
    if (component?.type === 'map') {
      await component.centreOnMap();
      return;
    }
    if (component?.type === 'molecule') {
      const selectionCid = selection || '/*/*/*/*';
      const centerZoomScale = this.centerZoomScaleByObject.get(component);
      await component.centreOn(selectionCid, false, !centerZoomScale);
      if (centerZoomScale) {
        const fittedZoom = await this.getFittedMoleculeZoom(component, selectionCid);
        if (!Number.isFinite(fittedZoom)) return;
        this.store.dispatch(setZoom(fittedZoom * centerZoomScale));
      }
    }
  }

  setOrientation(orientation) {
    const { origin, quat4, zoom } = normaliseMoorhenOrientation(orientation);

    if (origin) this.store.dispatch(setOrigin(origin));
    if (quat4) this.store.dispatch(setQuat(quat4));
    if (zoom != null) this.store.dispatch(setZoom(zoom));
  }

  getOrientation() {
    const glState = this.store.getState().glRef;
    const orientation = {
      origin: Array.from(glState.origin || [0, 0, 0]),
      quat4: Array.from(glState.quat || [0, 0, 0, -1]),
      zoom: glState.zoom
    };
    return { ...orientation, elements: [...orientation.quat4, ...orientation.origin, orientation.zoom] };
  }

  animateOrientation(orientation) {
    this.setOrientation(orientation);
    return Promise.resolve();
  }

  setParameters(parameters = {}) {
    if (parameters.backgroundColor != null) {
      const { rgb } = normaliseMoorhenColour(parameters.backgroundColor, '#000000');
      this.store.dispatch(setBackgroundColor([rgb.r / 255, rgb.g / 255, rgb.b / 255, 1]));
    }
    if (parameters.clipNear != null) this.store.dispatch(setClipStart(Number(parameters.clipNear)));
    if (parameters.clipFar != null) this.store.dispatch(setClipEnd(Number(parameters.clipFar)));
    if (parameters.fogNear != null) this.store.dispatch(setFogStart(Number(parameters.fogNear)));
    if (parameters.fogFar != null) this.store.dispatch(setFogEnd(Number(parameters.fogFar)));
    return parameters;
  }

  resize() {
    const element = this.containerElement?.current || this.containerElement;
    if (element && this.glRef.current?.resize) {
      this.glRef.current.resize(Math.max(element.clientWidth, 1), Math.max(element.clientHeight, 1));
    }
  }

  getRendererElement() {
    return this.glRef.current?.canvasRef?.current || this.glRef.current?.canvas;
  }

  getTaskCount() {
    return this.commandCentre.current?.activeMessages?.length || 0;
  }

  onTasksComplete(callback) {
    if (this.getTaskCount() === 0) {
      callback();
      return () => {};
    }
    const interval = setInterval(() => {
      if (this.getTaskCount() !== 0) return;
      clearInterval(interval);
      this.taskCompletionHandlers.delete(interval);
      callback();
    }, 50);
    this.taskCompletionHandlers.add(interval);
    return () => {
      clearInterval(interval);
      this.taskCompletionHandlers.delete(interval);
    };
  }

  normalizePick(event) {
    const atom = event?.detail?.atom;
    const buffer = event?.detail?.buffer;
    if (!atom) return null;
    const component = Array.from(this.objectsByName.values()).find(
      object => object.type === 'molecule' && object.buffersInclude?.(buffer)
    );
    return {
      kind: 'atom',
      position: { x: atom.x, y: atom.y, z: atom.z },
      componentName: component?.name
    };
  }

  addPickHandler(handler) {
    if (this.pickHandlers.has(handler) || typeof document === 'undefined') return;
    const wrappedHandler = event => handler(this, this.normalizePick(event));
    this.pickHandlers.set(handler, wrappedHandler);
    document.addEventListener('atomClicked', wrappedHandler);
  }

  removePickHandler(handler) {
    const wrappedHandler = this.pickHandlers.get(handler);
    if (!wrappedHandler || typeof document === 'undefined') return;
    document.removeEventListener('atomClicked', wrappedHandler);
    this.pickHandlers.delete(handler);
  }

  addOrientationChangeHandler(handler) {
    if (this.orientationHandlers.has(handler)) return;
    const wrappedHandler = () => handler();
    const canvas = this.getRendererElement();
    const documentObject = typeof document === 'undefined' ? null : document;
    this.orientationHandlers.set(handler, { wrappedHandler, canvas });
    documentObject?.addEventListener('originUpdate', wrappedHandler);
    documentObject?.addEventListener('zoomChanged', wrappedHandler);
    canvas?.addEventListener('pointerup', wrappedHandler);
    canvas?.addEventListener('wheel', wrappedHandler);
  }

  removeOrientationChangeHandler(handler) {
    const entry = this.orientationHandlers.get(handler);
    if (!entry) return;
    const documentObject = typeof document === 'undefined' ? null : document;
    documentObject?.removeEventListener('originUpdate', entry.wrappedHandler);
    documentObject?.removeEventListener('zoomChanged', entry.wrappedHandler);
    entry.canvas?.removeEventListener('pointerup', entry.wrappedHandler);
    entry.canvas?.removeEventListener('wheel', entry.wrappedHandler);
    this.orientationHandlers.delete(handler);
  }

  addClickHandler(handler) {
    if (this.clickHandlers.has(handler) || typeof document === 'undefined') return;
    const wrappedHandler = event => handler(this.normalizePick(event));
    this.clickHandlers.set(handler, wrappedHandler);
    document.addEventListener('atomClicked', wrappedHandler);
  }

  removeClickHandler(handler) {
    const wrappedHandler = this.clickHandlers.get(handler);
    if (!wrappedHandler || typeof document === 'undefined') return;
    document.removeEventListener('atomClicked', wrappedHandler);
    this.clickHandlers.delete(handler);
  }

  async removeObject(component) {
    component = await Promise.resolve(component);
    if (!component) return;
    if (component.linkedObjects) {
      for (const linkedObject of component.linkedObjects) await this.removeObject(linkedObject);
    }
    if (component.type === 'vector') {
      if (component.visible !== false) this.store.dispatch(removeVector(component.vector));
    } else {
      await component.delete?.();
      this.store.dispatch(component.type === 'map' ? removeMap(component) : removeMolecule(component));
    }
    for (const [name, object] of this.objectsByName.entries()) {
      if (object === component) this.objectsByName.delete(name);
    }
    this.representationsByObject.delete(component);
  }

  async removeAll() {
    for (const object of Array.from(new Set(this.objectsByName.values()))) {
      await this.removeObject(object);
    }
  }

  captureImage(options) {
    if (options && typeof options.capture === 'function') {
      return options.capture();
    }
    return Promise.resolve(this.getRendererElement()?.toDataURL('image/png'));
  }

  async destroy() {
    if (this.destroyed) return;
    await this.removeAll();
    Array.from(this.pickHandlers.keys()).forEach(handler => this.removePickHandler(handler));
    Array.from(this.clickHandlers.keys()).forEach(handler => this.removeClickHandler(handler));
    Array.from(this.orientationHandlers.keys()).forEach(handler => this.removeOrientationChangeHandler(handler));
    this.taskCompletionHandlers.forEach(interval => clearInterval(interval));
    this.taskCompletionHandlers.clear();
    if (this.runtime.viewerAdapter === this) {
      delete this.runtime.viewerAdapter;
    }
    this.destroyed = true;
  }
}

export default MoorhenViewerAdapter;
