import { MoorhenViewerAdapter } from './MoorhenViewerAdapter';
import { asViewerAdapter } from './viewerAdapterFactory';
import { getMoorhenLigandFocus } from './moorhenAdapterUtils';
import { copyRepresentationSettingsList } from './representationState';
import { createCcp4Map } from './fixtures/ccp4Map';
import fs from 'fs';
import { runInNewContext } from 'vm';
import ts from 'typescript';
import { loadNglObject, updateComponentRepresentation, deleteNglObject } from '../reducers/ngl/actions';
import nglReducers from '../reducers/ngl/nglReducers';
import { loadObject as loadViewerObject, deleteObject as deleteViewerObject } from '../reducers/ngl/dispatchActions';
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
  setHeight,
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
  setWidth,
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
    setHeight: action('moorhen/setHeight'),
    setMapAlpha: action('moorhen/setMapAlpha'),
    setMapColours: action('moorhen/setMapColours'),
    setMapRadius: action('moorhen/setMapRadius'),
    setMapStyle: action('moorhen/setMapStyle'),
    setNegativeMapColours: action('moorhen/setNegativeMapColours'),
    setOrigin: action('moorhen/setOrigin'),
    setPositiveMapColours: action('moorhen/setPositiveMapColours'),
    setQuat: action('moorhen/setQuat'),
    setWidth: action('moorhen/setWidth'),
    setZoom: action('moorhen/setZoom'),
    setZoomWheelSensitivityFactor: action('moorhen/setZoomWheelSensitivityFactor'),
    showMap: action('moorhen/showMap'),
    showMolecule: action('moorhen/showMolecule')
  };
});

const originalFetch = global.fetch;

// Exercise cleanup from the installed package. A mock delete that clears a Set
// cannot catch the difference between removing buffers and repainting the canvas.
const installedMapCleanup = () => {
  const bundle = fs.readFileSync(require.resolve('moorhen'), 'utf8');
  const marker = bundle.lastIndexOf('sourceMappingURL=data:');
  const sourceMap = JSON.parse(Buffer.from(bundle.slice(bundle.indexOf('base64,', marker) + 7), 'base64').toString());
  const source =
    sourceMap.sourcesContent[sourceMap.sources.findIndex(name => name.endsWith('/src/utils/MoorhenMap.ts'))];
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 }
  });
  const exports = {};
  const dependencies = name =>
    name.endsWith('/glRefSlice')
      ? { setDisplayBuffers: payload => ({ type: 'glRef/setDisplayBuffers', payload }) }
      : {};
  // The installed class is trusted application code; its unrelated dependencies
  // are unused by these three cleanup methods.
  runInNewContext(compiled.outputText, { require: dependencies, exports });
  return exports.MoorhenMap.prototype;
};

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
  showOnLoad: true,
  isOriginLocked: true,
  doCootContour: jest.fn(() => Promise.resolve()),
  setupContourBuffers: jest.fn(),
  hideMapContour: jest.fn(),
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

  it('keeps native scene and canvas dimensions in sync as Designs opens and closes without changing the camera', () => {
    expect.hasAssertions();
    const { adapter, store, glRef } = createAdapter();
    const dimensions = { clientWidth: 1400, clientHeight: 900 };
    adapter.containerElement = { current: dimensions };
    const camera = adapter.getOrientation();
    const drawScene = jest.fn();
    Object.assign(glRef.current, { drawScene });
    store.dispatch.mockImplementation(action => {
      if (action.type === setWidth().type) store.state.sceneSettings.width = action.payload;
      if (action.type === setHeight().type) store.state.sceneSettings.height = action.payload;
    });

    [
      [1400, 900],
      [950, 900],
      [1400, 900],
      [1200, 760]
    ].forEach(([width, height]) => {
      Object.assign(dimensions, { clientWidth: width, clientHeight: height });
      adapter.resize();
      expect(store.state.sceneSettings).toMatchObject({ width, height });
      expect(glRef.current.resize).toHaveBeenLastCalledWith(width, height);
      expect(adapter.getOrientation()).toStrictEqual(camera);
    });
    expect(drawScene).toHaveBeenCalledTimes(4);

    store.dispatch.mockClear();
    adapter.resize();
    expect(store.dispatch).not.toHaveBeenCalled();
    // A portal move can briefly detach the panel; do not overwrite the usable
    // dimensions with a 1x1 canvas or change the projection during that interval.
    Object.assign(dimensions, { clientWidth: 0, clientHeight: 0 });
    adapter.resize();
    expect(store.dispatch).not.toHaveBeenCalled();
    expect(glRef.current.resize).toHaveBeenCalledTimes(5);
    expect(drawScene).toHaveBeenCalledTimes(5);
    expect(store.state.sceneSettings).toMatchObject({ width: 1200, height: 760 });
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
    expect(protein.molecule.addRepresentation).toHaveBeenCalledWith('allHBonds', '/*/*/*/*');
    expect(protein.molecule.centreOn).not.toHaveBeenCalled();
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

  it('retains CCP4 origins and full-map settings when the native map manager mounts', async () => {
    expect.hasAssertions();
    const map = createMap();
    map.suggestedRadius = 3.74;
    map.suggestedContourLevel = 1.208;
    const nativeDraw = map.doCootContour;
    const nativeSetup = map.setupContourBuffers;
    const { adapter, store } = createAdapter({ map });
    const bytes = createCcp4Map();
    const original = bytes.slice();
    global.fetch = jest.fn(async () => ({ ok: true, arrayBuffer: async () => bytes.buffer }));
    nativeDraw.mockImplementation(function() {
      this.setupContourBuffers([{
        prim_types: [['LINES']],
        vert_tri: [[new Float32Array([13, 8.5, 10, 13, 9, 10])]],
        idx_tri: [[new Uint32Array([0, 1])]]
      }]);
      return Promise.resolve();
    });

    await adapter.loadMap('/sigmaa.ccp4', { name: 'sigmaa', parameters: { isolevel: 1.2, boxSize: 0, contour: true } });

    expect(global.fetch).toHaveBeenCalledWith('/sigmaa.ccp4', { credentials: 'same-origin' });
    expect(bytes).toStrictEqual(original);
    const nativeBytes = map.loadToCootFromMapData.mock.calls[0][0];
    expect(new DataView(nativeBytes.buffer).getFloat32(49 * 4, true)).toBe(0);
    expect(map.showOnLoad).toBe(false);
    expect(map.isOriginLocked).toBe(false);
    expect(nativeDraw.mock.calls[0][0]).toBeCloseTo(9.5);
    expect(nativeDraw.mock.calls[0][1]).toBeCloseTo(8);
    expect(nativeDraw.mock.calls[0][2]).toBeCloseTo(8.25);
    expect(nativeDraw.mock.calls[0][3]).toBeCloseTo(Math.hypot(9.5, 8, 8.25) + 0.001);
    expect(nativeDraw.mock.calls[0][4]).toBeCloseTo(0.411044554);
    const positions = nativeSetup.mock.calls[0][0][0].vert_tri[0][0];
    expect(positions[0]).toBeCloseTo(7.137);
    expect(positions[1]).toBeCloseTo(12.977);
    expect(positions[2]).toBeCloseTo(4.649);
    expect(adapter.getRepresentations(map)[0].params).toMatchObject({ isolevel: 1.2, boxSize: 0 });
    expect(map.mapCentre[0]).toBeCloseTo(-3.637);

    // A delayed native manager draw must retain the selected level and full map.
    await map.doCootContour(100, 200, 300, 3.74, 1.208, 'lines');
    expect(nativeDraw.mock.calls[1]).toStrictEqual(nativeDraw.mock.calls[0]);
    const handle = adapter.getRepresentations(map)[0];
    adapter.setRepresentationParameters(handle, { boxSize: 5, isolevel: 2 });
    await handle.ready;
    const draw = nativeDraw.mock.calls[2];
    expect(draw[0]).toBeCloseTo(-store.state.glRef.origin[0] + 5.863);
    expect(draw[1]).toBeCloseTo(-store.state.glRef.origin[1] - 4.477);
    expect(draw[2]).toBeCloseTo(-store.state.glRef.origin[2] + 5.351);
    expect(draw[3]).toBe(5);
    expect(draw[4]).toBeCloseTo(-0.0257808287 + 2 * 0.3640211523);
  });

  it('drains native map redraws and prevents delayed callbacks recreating deleted buffers', async () => {
    expect.hasAssertions();
    const map = createMap();
    const nativeDraw = map.doCootContour;
    const buffers = new Set();
    map.setupContourBuffers.mockImplementation(() => buffers.add('density'));
    map.delete.mockImplementation(async () => buffers.clear());
    nativeDraw.mockImplementation(function() { this.setupContourBuffers([]); return Promise.resolve(); });
    const { adapter } = createAdapter({ map });
    await adapter.loadMap(new Uint8Array([1]), { name: 'density' });
    expect(buffers.size).toBe(1);
    let finish;
    nativeDraw.mockImplementationOnce(async function() {
      await new Promise(resolve => { finish = resolve; });
      this.setupContourBuffers([]);
    });
    const redraw = map.doCootContour(0, 0, 0, 10, 1, 'lines');
    await Promise.resolve();
    await Promise.resolve();
    const removal = adapter.removeObject(map);
    await Promise.resolve();
    expect(map.delete).not.toHaveBeenCalled();
    finish();
    await Promise.all([redraw, removal]);
    const drawCount = nativeDraw.mock.calls.length;
    await map.doCootContour(0, 0, 0, 10, 1, 'lines');
    expect(nativeDraw).toHaveBeenCalledTimes(drawCount);
    expect(buffers.size).toBe(0);
    expect(adapter.getObject('density')).toBeUndefined();
    expect(map.delete).toHaveBeenCalledTimes(1);
  });

  it.each(['observation_DENSITY', 'observation_DENSITY_MAP_sigmaa', 'observation_DENSITY_MAP_diff'])(
    'repaints the canvas after native deletion of %s, retaining unrelated buffers',
    async name => {
      expect.hasAssertions();
      const { adapter, map, store, commandCentre, glRef } = createAdapter();
      const native = installedMapCleanup();
      map.delete = native.delete;
      map.hideMapContour = native.hideMapContour;
      map.clearBuffersOfStyle = native.clearBuffersOfStyle;
      map.store = store;
      map.commandCentre = commandCentre;
      map.displayObjects = { Coot: [] };
      Object.assign(commandCentre.current, { cootCommand: jest.fn(() => Promise.resolve()) });
      const proteinBuffer = { id: 'protein' };
      const densityBuffer = { id: name, clearBuffers: jest.fn(), parentMap: map };
      store.state.glRef.displayBuffers = [proteinBuffer];
      store.dispatch.mockImplementation(action => {
        if (action.type === 'glRef/setDisplayBuffers') store.state.glRef.displayBuffers = action.payload;
      });
      map.setupContourBuffers.mockImplementation(() => {
        map.displayObjects.Coot = [densityBuffer];
        store.state.glRef.displayBuffers = [proteinBuffer, densityBuffer];
      });
      map.doCootContour.mockImplementation(async () => map.setupContourBuffers([]));
      let frame;
      Object.assign(glRef.current, {
        drawScene: jest.fn(() => {
          frame = store.state.glRef.displayBuffers.map(buffer => buffer.id);
        })
      });
      await adapter.loadMap(new Uint8Array([1]), { name });
      expect(frame).toStrictEqual(['protein', name]);

      // The native map manager uses this same method for visibility/opacity edits.
      map.hideMapContour();
      expect(frame).toStrictEqual(['protein']);
      expect(store.state.glRef.displayBuffers).toStrictEqual([proteinBuffer]);
      await map.doCootContour(0, 0, 0, 15, 1, 'lines');
      expect(frame).toStrictEqual(['protein', name]);

      await adapter.removeObjects(name);

      expect(densityBuffer.clearBuffers).toHaveBeenCalledTimes(2);
      expect(map.displayObjects.Coot).toStrictEqual([]);
      expect(store.state.glRef.displayBuffers).toStrictEqual([proteinBuffer]);
      expect(adapter.getObject(name)).toBeUndefined();
      expect(frame).toStrictEqual(['protein']);
      await adapter.removeObjects(name);
      expect(commandCentre.current.cootCommand).toHaveBeenCalledTimes(1);
    }
  );

  it('propagates contour failures and disposes the partially loaded native map', async () => {
    expect.hasAssertions();
    const map = createMap();
    const error = new Error('Native contour failed');
    map.doCootContour.mockRejectedValueOnce(error);
    const { adapter } = createAdapter({ map });
    await expect(adapter.loadMap(new Uint8Array([1]), { name: 'failed-map' })).rejects.toBe(error);
    expect(map.delete).toHaveBeenCalledTimes(1);
    expect(adapter.getObject('failed-map')).toBeUndefined();
  });

  it('removes maps already loaded when a density batch partially fails', async () => {
    const sigmaaMap = createMap(19);
    const differenceMap = createMap(20);
    const { adapter, store } = createAdapter();
    const error = new Error('difference map failed');
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, arrayBuffer: async () => new Uint8Array([1]).buffer }));
    differenceMap.loadToCootFromMapData.mockRejectedValueOnce(error);
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
      ['allHBonds', '/*/*/(LIG)/*'],
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

  it('centres a deduplicated group with equal ligand weights and fits its full extent', async () => {
    const { adapter, store } = createAdapter();
    store.dispatch.mockClear();
    const first = createMolecule().molecule;
    const second = createMolecule(2).molecule;
    first.gemmiAtomsForCid = jest.fn(async () => [{ x: -1, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }]);
    second.gemmiAtomsForCid = jest.fn(async () => [{ x: 10, y: 0, z: 0 }]);

    expect(await adapter.centerOnObjects([first, second, first])).toBe(true);
    expect(first.gemmiAtomsForCid).toHaveBeenCalledTimes(1);
    expect(store.dispatch).toHaveBeenCalledWith(setOrigin([-5, -0, -0]));
    expect(store.dispatch).toHaveBeenCalledWith(setZoom(12 * 1.1 / 40));
    expect(first.centreOn).not.toHaveBeenCalled();
  });

  it('removes every native buffer when concurrent loads use the same object name', async () => {
    const { adapter } = createAdapter();
    const visibleBuffers = new Set();
    const molecules = [createMolecule(101), createMolecule(102)];
    for (const { molecule, representation } of molecules) {
      molecule.addRepresentation.mockImplementation(async () => {
        visibleBuffers.add(representation);
        molecule.representations.push(representation);
        return representation;
      });
      molecule.delete.mockImplementation(async () => { visibleBuffers.delete(representation); });
      MoorhenMolecule.mockImplementationOnce(() => molecule);
    }
    await Promise.all([
      adapter.loadMolecule('ATOM first', { name: 'same-ligand', fromString: true }),
      adapter.loadMolecule('ATOM second', { name: 'same-ligand', fromString: true })
    ]);
    await adapter.removeObject(adapter.getObject('same-ligand'));

    expect(adapter.getObjects('same-ligand')).toEqual([]);
    expect(visibleBuffers.size).toBe(0);
    for (const { molecule } of molecules) expect(molecule.delete).toHaveBeenCalledTimes(1);
  });

  it.each(['LIGAND', 'HIT_PROTEIN', 'DENSITY'])('honors %s deletion requested before native registration', async objectType => {
    const { adapter, molecule, map } = createAdapter();
    let release;
    const coordinates = new Promise(resolve => { release = resolve; });
    const target = { name: 'pending', OBJECT_TYPE: objectType };
    if (objectType === 'LIGAND') {
      target.sdf_info = { text: () => coordinates };
    } else if (objectType === 'HIT_PROTEIN') {
      target.prot_url = '/protein.pdb';
      global.fetch = jest.fn(() => coordinates.then(() => ({ ok: true, text: async () => 'ATOM\n' })));
    } else {
      target.render_event = true;
      target.event_url = '/event.map';
      global.fetch = jest.fn(() => coordinates.then(() => ({ ok: true, arrayBuffer: async () => new Uint8Array([1]).buffer })));
    }
    const loading = adapter.loadObject({ target });
    expect(adapter.getObject(target.name)).toBeUndefined();
    const removal = adapter.removeObjects(target.name);
    release('ATOM\n');
    await Promise.all([loading, removal]);

    expect(adapter.getObjects(target.name)).toEqual([]);
    expect((objectType === 'DENSITY' ? map : molecule).delete).toHaveBeenCalledTimes(1);
    expect(adapter.objectOperations.size).toBe(0);
  });

  it('keeps Redux empty when deletion arrives before the native load completes', async () => {
    const { adapter, molecule } = createAdapter();
    let state = { nglReducers: nglReducers(undefined, {}) };
    const dispatch = action => {
      if (typeof action === 'function') return action(dispatch, () => state);
      state = { nglReducers: nglReducers(state.nglReducers, action) };
      return action;
    };
    let release;
    molecule.loadToCootFromString.mockImplementation(() => new Promise(resolve => {
      release = () => { molecule.molNo = 1; resolve(molecule); };
    }));
    const target = { name: 'pending', OBJECT_TYPE: 'LIGAND', sdf_info: 'sdf', display_div: 'major_view' };
    const loading = dispatch(loadViewerObject({ target, stage: adapter }));
    const removal = dispatch(deleteViewerObject(target, adapter));
    release();
    await Promise.all([loading, removal]);
    expect(state.nglReducers.objectsInView).toEqual({});
    expect(state.nglReducers.countOfPendingNglObjects.major_view).toBe(0);
    expect(adapter.getObjects('pending')).toEqual([]);
    expect(molecule.delete).toHaveBeenCalledTimes(1);
  });

  it.each(['complex', 'map'])('does not orphan concurrently loaded %s objects', async kind => {
    const { adapter } = createAdapter();
    const active = new Set();
    const objects = [1, 2].map(id => kind === 'map' ? createMap(id) : createMolecule(id).molecule);
    for (const object of objects) {
      if (kind === 'map') {
        object.loadToCootFromMapData.mockImplementation(async () => { object.molNo = active.size + 1; active.add(object); return object; });
        MoorhenMap.mockImplementationOnce(() => object);
      } else {
        const addRepresentation = object.addRepresentation.getMockImplementation();
        object.addRepresentation.mockImplementation(async (...args) => { active.add(object); return addRepresentation.apply(object, args); });
      }
      object.delete.mockImplementation(async () => { active.delete(object); });
    }
    if (kind === 'complex') {
      // Composite loads have a temporary ligand which is deleted after merging.
      adapter.createNativeMolecule = jest.fn(async (source, name) =>
        name.endsWith('-ligand') ? createMolecule(10).molecule : objects.shift()
      );
    }
    const load = kind === 'map'
      ? () => adapter.loadMap(new Uint8Array([1]), { name: 'same-map' })
      : () => adapter.loadComplex({ name: 'same-complex', prot_url: 'ATOM\n', sdf_info: 'sdf' });
    await Promise.all([load(), load()]);
    expect(active.size).toBe(1);
    await adapter.removeObjects(`same-${kind}`);
    expect(active.size).toBe(0);
  });

  it('waits for pending redraws before removing buffers and closes a molecule only once', async () => {
    const { adapter, molecule } = createAdapter();
    await adapter.loadMolecule('ATOM\n', { name: 'edited', fromString: true });
    const [handle] = adapter.getRepresentations(molecule);
    const visibleBuffers = new Set([handle.nativeRepresentation]);
    let release;
    let started;
    const drawing = new Promise(resolve => { started = resolve; });
    handle.nativeRepresentation.redraw.mockImplementation(async () => {
      started();
      await new Promise(resolve => { release = resolve; });
      visibleBuffers.add(handle.nativeRepresentation);
    });
    molecule.delete.mockImplementation(async () => { visibleBuffers.delete(handle.nativeRepresentation); });
    adapter.setRepresentationParameters(handle, { opacity: 0.5 });
    await drawing;
    const firstRemoval = adapter.removeObjects('edited');
    const repeatedRemoval = adapter.removeObject(molecule);
    expect(molecule.delete).not.toHaveBeenCalled();
    release();
    await Promise.all([firstRemoval, repeatedRemoval]);
    expect(visibleBuffers.size).toBe(0);
    expect(molecule.delete).toHaveBeenCalledTimes(1);
  });

  it('drains pending loads during teardown instead of leaving newly registered structures behind', async () => {
    const { adapter, molecule } = createAdapter();
    let release;
    const source = { text: () => new Promise(resolve => { release = resolve; }) };
    const loading = adapter.loadMolecule(source, { name: 'pending', fromString: true });
    const destroying = adapter.destroy();
    release('ATOM\n');
    await Promise.all([loading, destroying]);
    expect(molecule.delete).toHaveBeenCalledTimes(1);
    expect(adapter.getObjects('pending')).toEqual([]);
    await expect(adapter.loadMolecule('ATOM\n')).rejects.toThrow('has been destroyed');
  });

  it('keeps native buffers out of state across repeated loads, representation edits and deletion', async () => {
    const { adapter, glRef } = createAdapter();
    let state = nglReducers(undefined, {});
    let settings = [{ type: 'licorice', params: { colorValue: 0x123456, opacity: 0.4, visible: true } }];
    for (let index = 1; index <= 12; index++) {
      const { molecule, representation } = createMolecule(index);
      // Model the native graph absent from the original lightweight test doubles.
      representation.parentMolecule = molecule;
      representation.glRef = glRef;
      representation.buffers = [new Float32Array(32768)];
      MoorhenMolecule.mockImplementation(() => molecule);
      const target = { name: `ligand-${index}`, OBJECT_TYPE: 'LIGAND', sdf_info: 'sdf' };
      const handles = await adapter.loadObject({ target, representations: settings });
      state = nglReducers(state, loadNglObject(target, handles));
      const descriptor = state.objectsInView[target.name].representations[0];
      const live = adapter.getRepresentation(molecule, descriptor);
      expect(live).toBe(handles[0]);
      expect(live.nativeRepresentation).toBe(representation);

      adapter.setRepresentationParameters(live, { opacity: 0.7 });
      await live.ready;
      state = nglReducers(state, updateComponentRepresentation(target.name, descriptor.uuid, live));
      expect(descriptor.params.opacity).toBe(0.4);
      expect(state.objectsInView[target.name].representations[0].params.opacity).toBe(0.7);
      await adapter.setVisibility(live, false);
      expect(representation.hide).toHaveBeenCalled();

      settings = copyRepresentationSettingsList([descriptor]);
      await adapter.removeObject(molecule);
      state = nglReducers(state, deleteNglObject(target));
      expect(molecule.delete).toHaveBeenCalledTimes(1);
      expect(adapter.getObject(target.name)).toBeUndefined();
      expect(adapter.getRepresentations(molecule)).toEqual([]);
      expect(adapter.getRepresentation(molecule, descriptor)).toBeUndefined();
    }
    expect(Object.keys(state.objectsInView)).toHaveLength(0);
    expect(Object.keys(state.objectsInViewStash)).toHaveLength(12);
    const saved = JSON.stringify(state.objectsInViewStash);
    expect(saved.length).toBeLessThan(12000);
    expect(saved).not.toMatch(/nativeRepresentation|parentObject|buffers|ready/);
  });

  it('awaits single-ligand focusing and leaves an empty selection unchanged', async () => {
    const { adapter, store } = createAdapter();
    store.dispatch.mockClear();
    const molecule = createMolecule().molecule;
    let complete;
    molecule.centreOn.mockReturnValue(new Promise(resolve => { complete = resolve; }));
    const focused = jest.fn();
    const pending = adapter.centerOnObjects([molecule]).then(focused);
    expect(focused).not.toHaveBeenCalled();
    complete();
    await pending;
    expect(focused).toHaveBeenCalledWith(true);
    expect(await adapter.centerOnObjects([])).toBe(false);
    expect(store.dispatch).not.toHaveBeenCalled();
  });

  it('presents depth-separated ligands horizontally and expands fitting for a narrow viewport', () => {
    const atoms = [[{ x: 0, y: 0, z: 0 }], [{ x: 0, y: 0, z: 10 }]];
    const focus = getMoorhenLigandFocus(atoms, [0, 0, 0, 1]);
    expect(focus.origin).toStrictEqual([-0, -0, -5]);
    expect(focus.quat4[0]).toBeCloseTo(0);
    expect(focus.quat4[1]).toBeCloseTo(Math.SQRT1_2);
    expect(focus.quat4[2]).toBeCloseTo(0);
    expect(focus.quat4[3]).toBeCloseTo(Math.SQRT1_2);
    expect(getMoorhenLigandFocus(atoms, [0, 0, 0, 1], 0.5).zoom).toBeCloseTo(focus.zoom * 2);
    expect(getMoorhenLigandFocus([[{ x: NaN, y: 0, z: 0 }]], [0, 0, 0, 1])).toBeNull();
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
