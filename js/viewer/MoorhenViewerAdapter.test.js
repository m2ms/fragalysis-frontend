import { MoorhenViewerAdapter } from './MoorhenViewerAdapter';
import { asViewerAdapter } from './viewerAdapterFactory';
import {
  MoorhenMap,
  MoorhenMolecule,
  addMap,
  addMolecule,
  addVector,
  hideMap,
  removeMap,
  removeMolecule,
  removeVector,
  setBackgroundColor,
  setActiveMap,
  setContourLevel,
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

jest.mock('moorhen', () => {
  const action = type => payload => ({ type, payload });
  const MockMoorhenMap = jest.fn();
  MockMoorhenMap.autoReadMtz = jest.fn();

  return {
    MoorhenReduxStore: {},
    MoorhenMolecule: jest.fn(),
    MoorhenMap: MockMoorhenMap,
    addMap: action('moorhen/addMap'),
    addMolecule: action('moorhen/addMolecule'),
    addVector: action('moorhen/addVector'),
    hideMap: action('moorhen/hideMap'),
    hideMolecule: action('moorhen/hideMolecule'),
    removeMap: action('moorhen/removeMap'),
    removeMolecule: action('moorhen/removeMolecule'),
    removeVector: action('moorhen/removeVector'),
    setActiveMap: action('moorhen/setActiveMap'),
    setBackgroundColor: action('moorhen/setBackgroundColor'),
    setClipEnd: action('moorhen/setClipEnd'),
    setClipStart: action('moorhen/setClipStart'),
    setContourLevel: action('moorhen/setContourLevel'),
    setFogEnd: action('moorhen/setFogEnd'),
    setFogStart: action('moorhen/setFogStart'),
    setMapAlpha: action('moorhen/setMapAlpha'),
    setMapColours: action('moorhen/setMapColours'),
    setMapRadius: action('moorhen/setMapRadius'),
    setMapStyle: action('moorhen/setMapStyle'),
    setNegativeMapColours: action('moorhen/setNegativeMapColours'),
    setOrigin: action('moorhen/setOrigin'),
    setPositiveMapColours: action('moorhen/setPositiveMapColours'),
    setQuat: action('moorhen/setQuat'),
    setZoom: action('moorhen/setZoom'),
    setZoomWheelSensitivityFactor: action('moorhen/setZoomWheelSensitivityFactor'),
    showMap: action('moorhen/showMap'),
    showMolecule: action('moorhen/showMolecule')
  };
});

const originalFetch = global.fetch;

const createStore = () => {
  const state = {
    sceneSettings: { backgroundColor: [0, 0, 0, 1], defaultBondSmoothness: 2 },
    molecules: { visibleMolecules: [] },
    maps: [],
    mapContourSettings: { visibleMaps: [] },
    glRef: { origin: [1, 2, 3], quat: [0, 0, 0, -1], zoom: 0.5 }
  };

  return { dispatch: jest.fn(), getState: jest.fn(() => state), state };
};

const createNativeRepresentation = (id = 'rep-1') => ({
  uniqueId: id,
  style: 'CRs',
  visible: true,
  bondOptions: { smoothness: 2, width: 0.1 },
  m2tParams: { ballsStyleRadiusMultiplier: 1 },
  addColourRule: jest.fn(),
  applyColourRules: jest.fn(() => Promise.resolve()),
  deleteBuffers: jest.fn(),
  hide: jest.fn(),
  redraw: jest.fn(() => Promise.resolve()),
  setBondOptions: jest.fn(),
  setColourRules: jest.fn(),
  setM2tParams: jest.fn(),
  setNonCustomOpacity: jest.fn(),
  setUseDefaultColourRules: jest.fn(),
  show: jest.fn(() => Promise.resolve())
});

const createMolecule = (molNo = 1) => {
  const representation = createNativeRepresentation(`rep-${molNo}`);
  const molecule = {
    type: 'molecule',
    uniqueId: `molecule-${molNo}`,
    molNo: null,
    name: 'unnamed',
    representations: [],
    moleculeDiameter: 20,
    defaultBondOptions: {},
    addRepresentation: jest.fn(function(style, cid) {
      representation.style = style;
      representation.cid = cid;
      this.representations.push(representation);
      return Promise.resolve(representation);
    }),
    buffersInclude: jest.fn(() => true),
    centreOn: jest.fn(() => Promise.resolve()),
    delete: jest.fn(() => Promise.resolve()),
    isVisible: jest.fn(() => true),
    loadToCootFromFile: jest.fn(function() {
      this.molNo = molNo;
      return Promise.resolve(this);
    }),
    loadToCootFromString: jest.fn(function() {
      this.molNo = molNo;
      return Promise.resolve(this);
    }),
    loadToCootFromURL: jest.fn(function() {
      this.molNo = molNo;
      return Promise.resolve(this);
    }),
    mergeMolecules: jest.fn(() => Promise.resolve()),
    setBackgroundColour: jest.fn()
  };
  return { molecule, representation };
};

const createMap = (molNo = 2) => ({
  type: 'map',
  uniqueId: `map-${molNo}`,
  molNo: null,
  name: 'unnamed',
  isDifference: false,
  centreOnMap: jest.fn(() => Promise.resolve()),
  delete: jest.fn(() => Promise.resolve()),
  loadToCootFromMapData: jest.fn(function(data, name, isDifference) {
    this.molNo = molNo;
    this.isDifference = isDifference;
    return Promise.resolve(this);
  }),
  loadToCootFromMapFile: jest.fn(function(file, isDifference) {
    this.molNo = molNo;
    this.isDifference = isDifference;
    return Promise.resolve(this);
  }),
  loadToCootFromMapURL: jest.fn(function(url, name, isDifference) {
    this.molNo = molNo;
    this.isDifference = isDifference;
    return Promise.resolve(this);
  }),
  loadToCootFromMtzData: jest.fn(function() {
    this.molNo = molNo;
    return Promise.resolve(this);
  }),
  loadToCootFromMtzFile: jest.fn(function() {
    this.molNo = molNo;
    return Promise.resolve(this);
  }),
  loadToCootFromMtzURL: jest.fn(function() {
    this.molNo = molNo;
    return Promise.resolve(this);
  })
});

const createAdapter = ({ molecule = createMolecule().molecule, map = createMap() } = {}) => {
  const store = createStore();
  const commandCentre = { current: { activeMessages: [] } };
  const canvas = document.createElement('canvas');
  canvas.toDataURL = jest.fn(() => 'data:image/png');
  const glRef = { current: { canvasRef: { current: canvas }, resize: jest.fn() } };
  MoorhenMolecule.mockImplementation(() => molecule);
  MoorhenMap.mockImplementation(() => map);

  return {
    adapter: new MoorhenViewerAdapter({ commandCentre, glRef, store, monomerLibraryPath: '/monomers' }),
    canvas,
    commandCentre,
    glRef,
    map,
    molecule,
    store
  };
};

describe('MoorhenViewerAdapter Stage 18 parity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('requires a runtime and is recovered by the generic adapter factory', () => {
    expect(() => new MoorhenViewerAdapter()).toThrow('requires commandCentre, glRef and store');
    const { adapter, store } = createAdapter();

    expect(asViewerAdapter(adapter.getNativeViewer())).toBe(adapter);
    expect(asViewerAdapter(adapter)).toBe(adapter);
    expect(store.dispatch).toHaveBeenCalledWith(setBackgroundColor([0, 0, 0, 1]));
    expect(store.dispatch).toHaveBeenCalledWith(setZoomWheelSensitivityFactor(8));
  });

  it('loads protein and ligand molecules with mapped styles and selections', async () => {
    const first = createMolecule();
    const { adapter, store } = createAdapter({ molecule: first.molecule });

    await adapter.loadMolecule('/models/tutorial.pdb', {
      name: 'tutorial',
      representation: 'cartoon',
      color: '#224466'
    });

    expect(MoorhenMolecule).toHaveBeenCalledWith(expect.any(Object), expect.any(Object), store, '/monomers');
    expect(first.molecule.loadToCootFromURL).toHaveBeenCalledWith('/models/tutorial.pdb', 'tutorial', undefined);
    expect(first.molecule.addRepresentation).toHaveBeenCalledWith('CRs', '/*/*/*/*');
    expect(first.representation.addColourRule).toHaveBeenCalledWith(
      'chain',
      '/*/*/*/*',
      '#224466',
      ['/*/*/*/*', '#224466'],
      false,
      true
    );
    expect(first.molecule.centreOn).not.toHaveBeenCalled();
    expect(store.dispatch).toHaveBeenCalledWith(addMolecule(first.molecule));
    expect(store.dispatch).toHaveBeenCalledWith(showMolecule(first.molecule));

    const ligand = createMolecule(3);
    MoorhenMolecule.mockImplementation(() => ligand.molecule);
    await adapter.loadObject({
      target: { OBJECT_TYPE: 'LIGAND', name: 'ligand', sdf_info: 'ligand sdf', colour: '#abcdef' },
      object_name: 'ligand',
      center: true
    });
    expect(ligand.molecule.loadToCootFromString).toHaveBeenCalledWith('ligand sdf', 'ligand');
    expect(ligand.molecule.addRepresentation).toHaveBeenCalledWith('ligands', '/*/*/*/*');
    expect(ligand.representation.setBondOptions).toHaveBeenCalledWith(expect.objectContaining({ width: 0.22 }));
    expect(ligand.representation.setM2tParams).toHaveBeenCalledWith(
      expect.objectContaining({ ballsStyleRadiusMultiplier: 1.35 })
    );
    expect(ligand.representation.addColourRule).toHaveBeenCalledWith(
      'chain',
      '/*/*/*/*',
      '#abcdef',
      ['/*/*/*/*', '#abcdef'],
      false,
      false
    );
    expect(ligand.molecule.centreOn).toHaveBeenCalledWith('/*/*/*/*', false, false);
    expect(store.dispatch).toHaveBeenCalledWith(setZoom(0.9));

    store.dispatch.mockClear();
    await adapter.centerOn(ligand.molecule);
    expect(ligand.molecule.centreOn).toHaveBeenCalledTimes(2);
    expect(store.dispatch).toHaveBeenCalledWith(setZoom(0.9));

    const rightSideLigand = createMolecule(10);
    MoorhenMolecule.mockImplementation(() => rightSideLigand.molecule);
    const rightSideRepresentations = await adapter.loadObject({
      target: { OBJECT_TYPE: 'LIGAND', name: 'right-side-ligand', sdf_info: 'ligand sdf' },
      object_name: 'right-side-ligand',
      markAsRightSideLigand: true
    });
    expect(rightSideLigand.molecule.addRepresentation).toHaveBeenCalledWith('CBs', '/*/*/*/*');
    expect(rightSideRepresentations[0].params).toEqual(
      expect.objectContaining({ multipleBond: true, radiusSize: 0.11 })
    );
    expect(rightSideLigand.representation.setBondOptions).toHaveBeenCalledWith(
      expect.objectContaining({ width: 0.11 })
    );
  });

  it('keeps the latest explicit focus when molecule loads finish out of order', async () => {
    expect.assertions(2);
    const first = createMolecule(19);
    const second = createMolecule(20);
    const { adapter } = createAdapter();
    let resolveFirst;
    let resolveSecond;
    first.molecule.loadToCootFromURL.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveFirst = () => {
            first.molecule.molNo = 19;
            resolve(first.molecule);
          };
        })
    );
    second.molecule.loadToCootFromURL.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveSecond = () => {
            second.molecule.molNo = 20;
            resolve(second.molecule);
          };
        })
    );
    MoorhenMolecule.mockImplementationOnce(() => first.molecule).mockImplementationOnce(() => second.molecule);

    const firstLoad = adapter.loadMolecule('/models/first.pdb', { name: 'first', center: true });
    const secondLoad = adapter.loadMolecule('/models/second.pdb', { name: 'second', center: true });
    resolveSecond();
    await secondLoad;
    resolveFirst();
    await firstLoad;

    expect(second.molecule.centreOn).toHaveBeenCalledTimes(1);
    expect(first.molecule.centreOn).not.toHaveBeenCalled();
  });

  it("loads MOL text through Moorhen's coordinate-preserving MOL converter", async () => {
    expect.assertions(3);
    const ligand = createMolecule(21);
    const { adapter } = createAdapter({ molecule: ligand.molecule });
    const molfile = [
      'ligand',
      '  Fragalysis',
      '',
      '  1  0  0  0  0  0  0  0  0  0999 V2000',
      '    5.0000   14.0000    4.0000 C   0  0  0  0  0  0  0  0  0  0  0  0',
      'M  END',
      ''
    ].join('\n');

    await adapter.loadObject({
      target: { OBJECT_TYPE: 'LIGAND', name: 'ligand', sdf_info: molfile },
      object_name: 'ligand',
      center: true
    });

    const [loadedFile] = ligand.molecule.loadToCootFromFile.mock.calls[0];
    expect(loadedFile).toBeInstanceOf(File);
    expect(loadedFile.name).toBe('ligand.mol');
    expect(ligand.molecule.loadToCootFromString).not.toHaveBeenCalled();
  });

  it.each([
    ['HIT_PROTEIN', '/hit-protein.pdb', 2.4, 0.12],
    ['ARTEFACTS', '/artefacts.pdb', 1.2, 0.06]
  ])(
    'removes bound ligand records from %s and uses a restrained sidechain width',
    async (objectType, source, linewidth, width) => {
      expect.assertions(10);
      const protein = createMolecule(11);
      const { adapter } = createAdapter({ molecule: protein.molecule });
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          text: () =>
            Promise.resolve(
              [
                'ATOM      1  CA  ALA A   1      10.000  10.000  10.000  1.00 20.00           C',
                'HETATM    2  C1  LIG A 147      11.000  10.000  10.000  1.00 20.00           C',
                'ANISOU    2  C1  LIG A 147     1000   1000   1000      0      0      0       C',
                'HETATM    3  O   HOH A 201      12.000  10.000  10.000  1.00 20.00           O',
                'CONECT    2    1',
                'END'
              ].join('\n')
            )
        })
      );

      const target = {
        OBJECT_TYPE: objectType,
        name: objectType.toLowerCase(),
        prot_url: source,
        artefacts_url: source,
        sdf_info: 'ligand sdf',
        colour: '#123456'
      };
      const representations = await adapter.loadObject({ target, object_name: target.name });

      expect(global.fetch).toHaveBeenCalledWith(source, { credentials: 'same-origin' });
      expect(MoorhenMolecule).toHaveBeenCalledTimes(1);
      expect(protein.molecule.loadToCootFromURL).not.toHaveBeenCalled();
      const [loadedPdb] = protein.molecule.loadToCootFromString.mock.calls[0];
      expect(loadedPdb).not.toContain('LIG');
      expect(loadedPdb).toContain('HOH');
      expect(loadedPdb).not.toContain('CONECT');
      expect(protein.molecule.mergeMolecules).not.toHaveBeenCalled();
      expect(protein.molecule.addRepresentation).toHaveBeenCalledWith('CBs', '/*/*/*/*');
      expect(representations[0].params).toEqual(expect.objectContaining({ linewidth, sele: '/0' }));
      expect(protein.representation.setBondOptions.mock.calls[0][0].width).toBeCloseTo(width);
    }
  );

  it('builds a complex by merging the ligand into the protein', async () => {
    const protein = createMolecule(4);
    const ligand = createMolecule(5);
    const { adapter } = createAdapter();
    MoorhenMolecule.mockImplementationOnce(() => protein.molecule).mockImplementationOnce(() => ligand.molecule);

    const representations = await adapter.loadObject({
      target: { OBJECT_TYPE: 'COMPLEX', name: 'complex', prot_url: '/protein.pdb', sdf_info: 'ligand sdf' },
      object_name: 'complex'
    });

    expect(protein.molecule.mergeMolecules).toHaveBeenCalledWith([ligand.molecule], false, false);
    expect(ligand.molecule.delete).toHaveBeenCalledTimes(1);
    expect(protein.molecule.addRepresentation).toHaveBeenCalledWith('contact_dots', '/*/*/*/*');
    expect(representations).toHaveLength(1);
  });

  it('cleans both native molecules when a composite merge fails', async () => {
    const protein = createMolecule(17);
    const ligand = createMolecule(18);
    const { adapter } = createAdapter();
    const error = new Error('merge failed');
    protein.molecule.mergeMolecules.mockRejectedValueOnce(error);
    MoorhenMolecule.mockImplementationOnce(() => protein.molecule).mockImplementationOnce(() => ligand.molecule);

    await expect(
      adapter.loadObject({
        target: { OBJECT_TYPE: 'COMPLEX', name: 'broken-complex', prot_url: '/protein.pdb', sdf_info: 'ligand sdf' }
      })
    ).rejects.toBe(error);

    expect(protein.molecule.delete).toHaveBeenCalledTimes(1);
    expect(ligand.molecule.delete).toHaveBeenCalledTimes(1);
    expect(adapter.getObject('broken-complex')).toBeUndefined();
  });

  it('loads molecular surfaces with the Fragalysis appearance defaults', async () => {
    const surface = createMolecule(9);
    const { adapter } = createAdapter({ molecule: surface.molecule });

    const representations = await adapter.loadObject({
      target: { OBJECT_TYPE: 'SURFACE', name: 'surface', prot_url: '/surface.pdb', colour: 'cyan' },
      object_name: 'surface'
    });

    expect(surface.molecule.addRepresentation).toHaveBeenCalledWith('MolecularSurface', '/*/*/*/*');
    expect(surface.representation.setNonCustomOpacity).toHaveBeenCalledWith(0.74);
    expect(representations[0].params.sele).toBe('polymer');
  });

  it('loads maps and translates density appearance controls', async () => {
    const map = createMap();
    const { adapter, store } = createAdapter({ map });

    await adapter.loadMap(new Uint8Array([1, 2, 3]), {
      name: 'difference-map',
      isDifference: true,
      parameters: {
        isolevel: -3,
        boxSize: 12,
        opacity: 0.6,
        contour: false,
        color: 'lightgreen',
        negativeColor: 'tomato'
      }
    });

    expect(store.dispatch).toHaveBeenCalledWith(addMap(map));
    expect(store.dispatch).toHaveBeenCalledWith(setActiveMap(map));
    expect(store.dispatch).toHaveBeenCalledWith(setContourLevel({ molNo: 2, contourLevel: 3 }));
    expect(store.dispatch).toHaveBeenCalledWith(setMapRadius({ molNo: 2, radius: 12 }));
    expect(store.dispatch).toHaveBeenCalledWith(setMapAlpha({ molNo: 2, alpha: 0.6 }));
    expect(store.dispatch).toHaveBeenCalledWith(setMapStyle({ molNo: 2, style: 'solid' }));
    expect(store.dispatch).toHaveBeenCalledWith(setPositiveMapColours({ molNo: 2, rgb: { r: 144, g: 238, b: 144 } }));
    expect(store.dispatch).toHaveBeenCalledWith(setNegativeMapColours({ molNo: 2, rgb: { r: 255, g: 99, b: 71 } }));
    expect(adapter.getRepresentationCount(map)).toBe(1);

    adapter.setRepresentationParameters(adapter.getRepresentations(map)[0], { color: 'cyan' });
    expect(store.dispatch).toHaveBeenCalledWith(setPositiveMapColours({ molNo: 2, rgb: { r: 0, g: 255, b: 255 } }));
  });

  it('removes maps already loaded when a density batch partially fails', async () => {
    const sigmaaMap = createMap(19);
    const differenceMap = createMap(20);
    const { adapter, store } = createAdapter();
    const error = new Error('difference map failed');
    differenceMap.loadToCootFromMapURL.mockRejectedValueOnce(error);
    MoorhenMap.mockImplementationOnce(() => sigmaaMap).mockImplementationOnce(() => differenceMap);

    await expect(
      adapter.loadObject({
        target: {
          OBJECT_TYPE: 'DENSITY',
          name: 'density',
          render_sigmaa: true,
          sigmaa_url: '/sigmaa.map',
          render_diff: true,
          diff_url: '/difference.map'
        }
      })
    ).rejects.toBe(error);

    expect(sigmaaMap.delete).toHaveBeenCalledTimes(1);
    expect(store.dispatch).toHaveBeenCalledWith(removeMap(sigmaaMap));
    expect(adapter.getObject('density_MAP_sigmaa')).toBeUndefined();
  });

  it('loads the event molecule with ligand/contact layers and a linked difference map', async () => {
    const molecule = createMolecule(13);
    const map = createMap(14);
    const { adapter, store } = createAdapter({ molecule: molecule.molecule, map });

    const representations = await adapter.loadObject({
      target: {
        OBJECT_TYPE: 'EVENTMAP',
        name: 'event',
        pdb_info: 'ATOM\n',
        map_info: new Uint8Array([1, 2, 3])
      },
      object_name: 'event'
    });

    expect(molecule.molecule.addRepresentation.mock.calls).toEqual([
      ['CRs', '/*/*/*/*'],
      ['contact_dots', '/*/*/(LIG)/*'],
      ['ligands', '/*/*/(LIG)/*']
    ]);
    expect(map.loadToCootFromMapData).toHaveBeenCalledWith(expect.any(Uint8Array), 'event_EVENT_MAP', true);
    expect(representations).toHaveLength(4);

    const mapRepresentation = representations.find(representation => representation.parentObject === map);
    adapter.removeRepresentation(molecule.molecule, mapRepresentation);
    expect(store.dispatch).toHaveBeenCalledWith(hideMap(map));
    expect(adapter.getRepresentations(molecule.molecule)).not.toContain(mapRepresentation);
    expect(adapter.getRepresentations(map)).not.toContain(mapRepresentation);
  });

  it('removes the event molecule when its map fails to load', async () => {
    const molecule = createMolecule(21);
    const map = createMap(22);
    const { adapter, store } = createAdapter({ molecule: molecule.molecule, map });
    const error = new Error('event map failed');
    map.loadToCootFromMapData.mockRejectedValueOnce(error);

    await expect(
      adapter.loadObject({
        target: { OBJECT_TYPE: 'EVENTMAP', name: 'broken-event', pdb_info: 'ATOM\n', map_info: new Uint8Array([1]) }
      })
    ).rejects.toBe(error);

    expect(molecule.molecule.delete).toHaveBeenCalledTimes(1);
    expect(store.dispatch).toHaveBeenCalledWith(removeMolecule(molecule.molecule));
    expect(adapter.getObject('broken-event')).toBeUndefined();
  });

  it('auto-reads MTZ maps and gives each map a surface handle', async () => {
    const firstMap = createMap(6);
    firstMap.molNo = 6;
    firstMap.name = 'tutorial-map-0';
    const secondMap = createMap(7);
    secondMap.molNo = 7;
    secondMap.name = 'tutorial-map-1';
    const { adapter, commandCentre, glRef, store } = createAdapter();
    const source = { name: 'tutorial.mtz' };
    MoorhenMap.autoReadMtz.mockResolvedValue([firstMap, secondMap]);

    await expect(adapter.loadMap(source, { ext: 'mtz', autoRead: true })).resolves.toBe(firstMap);

    expect(MoorhenMap.autoReadMtz).toHaveBeenCalledWith(source, commandCentre, glRef, store);
    expect(adapter.getRepresentationCount(firstMap)).toBe(1);
    expect(adapter.getRepresentationCount(secondMap)).toBe(1);
  });

  it('renders vectors and radius spheres', async () => {
    const sphere = createMolecule(8);
    const { adapter, store } = createAdapter({ molecule: sphere.molecule });
    const vector = {
      coordsMode: 'points',
      labelText: 'interaction',
      uniqueId: 'interaction',
      vectorColour: { r: 255, g: 0, b: 0 }
    };

    const vectorObject = adapter.loadVector(vector);
    expect(store.dispatch).toHaveBeenCalledWith(addVector(vector));
    await adapter.setVisibility(vectorObject, false);
    expect(store.dispatch).toHaveBeenCalledWith(removeVector(vector));

    const sphereObject = await adapter.addSphere({
      name: 'radius-sphere',
      center: { x: 1, y: 2, z: 3 },
      color: [0, 1, 0],
      radius: 3.4,
      representationParameters: { opacity: 0.5 }
    });
    const handle = adapter.getRepresentations(sphereObject)[0];
    await handle.ready;
    expect(sphere.molecule.loadToCootFromString).toHaveBeenCalledWith(
      expect.stringContaining('HETATM'),
      'radius-sphere'
    );
    expect(sphere.molecule.addRepresentation).toHaveBeenCalledWith('VdwSpheres', '/*/*/*/*');
    expect(sphere.representation.setM2tParams).toHaveBeenCalledWith(
      expect.objectContaining({ ballsStyleRadiusMultiplier: 2 })
    );
  });

  it('creates, edits, hides and removes stable representation handles', async () => {
    const first = createMolecule();
    const { adapter } = createAdapter({ molecule: first.molecule });
    await adapter.loadMolecule('ATOM\n', { name: 'molecule', fromString: true });

    const surface = adapter.createRepresentation(first.molecule, 'surface', { opacity: 0.5 }, 'legacy-id');
    await surface.ready;
    expect(surface.lastKnownID).toBe('legacy-id');
    expect(first.molecule.addRepresentation).toHaveBeenLastCalledWith('MolecularSurface', '/*/*/*/*');

    adapter.setRepresentationParameters(surface, { sele: 'LIG', opacity: 0.25 });
    await surface.ready;
    expect(first.molecule.addRepresentation).toHaveBeenLastCalledWith('MolecularSurface', '/*/*/(LIG)/*');
    await adapter.setVisibility(surface, false);
    expect(surface.nativeRepresentation.hide).toHaveBeenCalled();

    adapter.removeRepresentation(first.molecule, surface);
    expect(adapter.getRepresentations(first.molecule)).not.toContain(surface);
  });

  it('rejects failed representation work and removes a representation that never initialized', async () => {
    const first = createMolecule();
    const { adapter } = createAdapter({ molecule: first.molecule });
    await adapter.loadMolecule('ATOM\n', { name: 'molecule', fromString: true });
    const error = new Error('representation failed');
    first.molecule.addRepresentation.mockRejectedValueOnce(error);

    const failed = adapter.createRepresentation(first.molecule, 'surface');

    await expect(failed.ready).rejects.toBe(error);
    expect(failed.error).toBe(error);
    expect(adapter.getRepresentations(first.molecule)).not.toContain(failed);

    first.representation.redraw.mockRejectedValueOnce(error);
    const edited = adapter.setRepresentationParameters(adapter.getRepresentations(first.molecule)[0], {
      opacity: 0.5
    });
    await expect(edited.ready).rejects.toBe(error);
    expect(edited.error).toBe(error);
  });

  it('removes a newly loaded molecule when its initial representation fails', async () => {
    const first = createMolecule(23);
    const { adapter, store } = createAdapter({ molecule: first.molecule });
    const error = new Error('initial representation failed');
    first.molecule.addRepresentation.mockRejectedValueOnce(error);

    await expect(adapter.loadMolecule('ATOM\n', { name: 'broken-molecule', fromString: true })).rejects.toBe(error);

    expect(first.molecule.delete).toHaveBeenCalledTimes(1);
    expect(store.dispatch).toHaveBeenCalledWith(removeMolecule(first.molecule));
    expect(adapter.getObject('broken-molecule')).toBeUndefined();
  });

  it('persists orientation, normalizes atom events and captures screenshots', async () => {
    const first = createMolecule();
    const { adapter, store } = createAdapter({ molecule: first.molecule });
    await adapter.loadMolecule('ATOM\n', { name: 'molecule', fromString: true });
    const orientation = new Float32Array([0, 0, 0, -1, 4, 5, 6, 0.75]);

    adapter.setOrientation(orientation);
    expect(store.dispatch).toHaveBeenCalledWith(setQuat([0, 0, 0, -1]));
    expect(store.dispatch).toHaveBeenCalledWith(setOrigin([4, 5, 6]));
    expect(store.dispatch).toHaveBeenCalledWith(setZoom(0.75));
    expect(adapter.getOrientation().elements).toEqual([0, 0, 0, -1, 1, 2, 3, 0.5]);

    const clickHandler = jest.fn();
    const pickHandler = jest.fn();
    adapter.addClickHandler(clickHandler);
    adapter.addPickHandler(pickHandler);
    document.dispatchEvent(
      new CustomEvent('atomClicked', { detail: { atom: { x: 7, y: 8, z: 9 }, buffer: { id: 1 } } })
    );
    expect(clickHandler).toHaveBeenCalledWith({
      kind: 'atom',
      position: { x: 7, y: 8, z: 9 },
      componentName: 'molecule'
    });
    expect(pickHandler).toHaveBeenCalledWith(adapter, expect.objectContaining({ kind: 'atom' }));
    await expect(adapter.captureImage()).resolves.toBe('data:image/png');
  });

  it('centres objects, reports completed work and cleans every owned object', async () => {
    const first = createMolecule();
    const map = createMap();
    const { adapter, store } = createAdapter({ molecule: first.molecule, map });
    await adapter.loadMolecule('ATOM\n', { name: 'molecule', fromString: true });
    await adapter.loadMap(new Uint8Array([1]), { name: 'map' });
    const vector = adapter.loadVector({ uniqueId: 'vector', labelText: 'vector' });
    const onComplete = jest.fn();

    await adapter.centerOn(first.molecule, '//A/1');
    await adapter.centerOn(map);
    adapter.onTasksComplete(onComplete);
    expect(first.molecule.centreOn).toHaveBeenCalledWith('//A/1', false, true);
    expect(map.centreOnMap).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledTimes(1);

    const runtime = adapter.getNativeViewer();
    await adapter.destroy();
    expect(first.molecule.delete).toHaveBeenCalledTimes(1);
    expect(map.delete).toHaveBeenCalledTimes(1);
    expect(store.dispatch).toHaveBeenCalledWith(removeMolecule(first.molecule));
    expect(store.dispatch).toHaveBeenCalledWith(removeMap(map));
    expect(store.dispatch).toHaveBeenCalledWith(removeVector(vector.vector));
    expect(adapter.getObjects('molecule')).toEqual([]);
    expect(runtime.viewerAdapter).toBeUndefined();
    await expect(adapter.loadMolecule('ATOM\n', { fromString: true })).rejects.toThrow('has been destroyed');
  });

  it('uses regular map colours for non-difference density and supports visibility', async () => {
    const map = createMap();
    const { adapter, store } = createAdapter({ map });
    await adapter.loadMap(new Uint8Array([1]), {
      name: 'event-map',
      parameters: { color: 'blue', visible: false }
    });

    expect(store.dispatch).toHaveBeenCalledWith(setMapColours({ molNo: 2, rgb: { r: 0, g: 0, b: 255 } }));
    expect(store.dispatch).toHaveBeenCalledWith(hideMap(map));
    await adapter.setVisibility(map, true);
    expect(store.dispatch).toHaveBeenCalledWith(showMap(map));
  });
});
