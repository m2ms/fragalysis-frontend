const fs = require('fs');
const { runInNewContext } = require('vm');
const ts = require('typescript');
const { parse } = require('@babel/parser');
const { transformMoorhenLabels } = require('./moorhenLabelsLoader');
const { transformNativeBufferPublication } = require('./moorhenBuffersLoader');
const { transformMoorhenModels } = require('./moorhenModelsLoader');

const bundlePath = require.resolve('moorhen');
const bundle = fs.readFileSync(bundlePath, 'utf8');
const marker = bundle.lastIndexOf('sourceMappingURL=data:');
const map = JSON.parse(Buffer.from(bundle.slice(bundle.indexOf('base64,', marker) + 7), 'base64').toString());
const nativeSource = ['/src/WebGLgComponents/buildBuffers.ts', '/src/utils/MoorhenMoleculeRepresentation.ts']
  .map(
    suffix =>
      `(function(exports, require) {\n${
        ts.transpileModule(map.sourcesContent[map.sources.findIndex(name => name.endsWith(suffix))], {
          compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 }
        }).outputText
      }\n})(exports, require);`
  )
  .join('\n');
const patchedNativeSource = transformMoorhenLabels(nativeSource);

const setup = (source = patchedNativeSource) => {
  const existingLabel = { uuid: 'protein', label: { text: 'protein', x: 0, y: 0, z: 0 } };
  existingLabel.nativeOwner = { label: existingLabel }; // Never clone native graphs.
  const existingTexture = { uuid: 'texture' };
  const existingBuffer = { visible: true };
  const state = {
    glRef: {
      glCtx: {},
      labelBuffers: [existingLabel],
      texturedShapes: [existingTexture],
      displayBuffers: [existingBuffer]
    },
    labelSettings: { GLLabelsFontFamily: 'sans-serif', GLLabelsFontSize: 12 }
  };
  const actions = [];
  const store = {
    getState: () => state,
    dispatch: action => {
      actions.push(action);
      if (action.type === 'labels') state.glRef.labelBuffers = action.payload;
      if (action.type === 'textures') state.glRef.texturedShapes = action.payload;
      if (action.type === 'display') state.glRef.displayBuffers = action.payload;
    }
  };
  const exports = {};
  const action = type => payload => ({ type, payload });
  let id = 0;
  runInNewContext(source, {
    exports,
    window: { devicePixelRatio: 1 },
    require: name => {
      if (name.endsWith('MoorhenReduxStore')) return { default: store };
      if (name.endsWith('glRefSlice'))
        return {
          setLabelBuffers: action('labels'),
          setTexturedShapes: action('textures'),
          setDisplayBuffers: action('display'),
          setRequestDrawScene: action('draw')
        };
      if (name === 'react-redux') return { batch: callback => callback() };
      if (name.endsWith('/utils')) return { guid: () => `label-${++id}` };
      return {};
    }
  });
  // Use the installed methods without constructing a molecule or worker.
  const representation = Object.create(exports.MoorhenMoleculeRepresentation.prototype);
  Object.assign(representation, { parentMolecule: { store }, buffers: [], visible: false, draw: jest.fn() });
  return { ...exports, state, store, actions, representation, existingLabel, existingTexture, existingBuffer };
};

describe('native redundant label and texture update bridge', () => {
  it('patches the installed package and composes with the existing native bridges', () => {
    expect.hasAssertions();
    const transformed = transformMoorhenModels(transformNativeBufferPublication(transformMoorhenLabels(bundle)));
    expect(() => parse(transformed)).not.toThrow();
    expect(transformed).toContain('.publishNativeBuffers(');
    expect(transformed).not.toContain('//# sourceMappingURL=data:');
    expect(fs.readFileSync(bundlePath, 'utf8')).toBe(bundle);
  });

  it('fails visibly for missing or duplicate native update sites', () => {
    expect.hasAssertions();
    expect(() => transformMoorhenLabels('class Other {}')).toThrow('exactly one');
    expect(() => transformMoorhenLabels(`(()=>{${nativeSource}})();(()=>{${nativeSource}})();`)).toThrow('exactly one');
  });

  it('keeps label and texture identities when a mesh adds neither', () => {
    expect.hasAssertions();
    const { appendOtherData, state, actions } = setup();
    const { labelBuffers, texturedShapes } = state.glRef;
    expect(appendOtherData({ norm_tri: [] })).toHaveLength(0);
    expect(actions).toHaveLength(0);
    expect(state.glRef.labelBuffers).toBe(labelBuffers);
    expect(state.glRef.texturedShapes).toBe(texturedShapes);
  });

  it('publishes real native text labels and preserves unrelated label and texture objects', () => {
    expect.hasAssertions();
    const { appendOtherData, state, actions, existingLabel, existingTexture } = setup();
    const buffers = appendOtherData({
      norm_tri: [[]],
      prim_types: [['TEXTLABELS']],
      idx_tri: [[0]],
      label_tri: [['LIG']],
      vert_tri: [[1, 2, 3]]
    });
    expect(buffers).toHaveLength(1);
    expect(actions.map(action => action.type)).toStrictEqual(['labels']);
    expect(state.glRef.labelBuffers[0]).toBe(existingLabel);
    expect(state.glRef.labelBuffers[1].label).toMatchObject({ text: 'LIG', x: 1, y: 2, z: 3 });
    expect(state.glRef.texturedShapes[0]).toBe(existingTexture);
  });

  it('preserves the native repaint signals when opaque buffers are shown, hidden or deleted', async () => {
    expect.hasAssertions();
    const { representation, state, actions, existingBuffer, existingLabel } = setup();
    const buffer = { visible: false, clearBuffers: jest.fn() };
    buffer.owner = { buffer };
    representation.buffers = [buffer];
    state.glRef.displayBuffers.push(buffer);
    await representation.show();
    expect(buffer.visible).toBe(true);
    representation.hide();
    expect(buffer.visible).toBe(false);
    representation.deleteBuffers();
    expect(actions.map(action => action.type)).toStrictEqual(['labels', 'labels', 'display', 'labels']);
    expect(state.glRef.displayBuffers).toStrictEqual([existingBuffer]);
    expect(state.glRef.labelBuffers).toStrictEqual([existingLabel]);
    expect(representation.buffers).toHaveLength(0);
  });

  it('keeps actual label show, hide and deletion updates, including removal of the last label', async () => {
    expect.hasAssertions();
    const { representation, state, actions, existingLabel } = setup();
    const label = { text: 'LIG', x: 1, y: 2, z: 3 };
    const buffer = { uuid: 'ligand', labels: [label] };
    representation.buffers = [buffer];
    await representation.show();
    expect(state.glRef.labelBuffers.map(item => item.uuid)).toStrictEqual(['protein', 'ligand']);
    expect(state.glRef.labelBuffers[1].label).toBe(label);
    representation.hide();
    expect(state.glRef.labelBuffers).toStrictEqual([existingLabel]);
    await representation.show();
    state.glRef.labelBuffers = state.glRef.labelBuffers.filter(item => item.uuid !== 'protein');
    representation.deleteBuffers();
    expect(state.glRef.labelBuffers).toHaveLength(0);
    expect(actions.filter(action => action.type === 'labels')).toHaveLength(4);
  });

  it('preserves native removal and repeated deletion behaviour outside mesh creation', () => {
    expect.hasAssertions();
    const { representation, actions, state } = setup();
    const before = state.glRef.labelBuffers;
    representation.buffers = [{ uuid: 'already-removed', labels: [] }];
    representation.hide();
    representation.deleteBuffers();
    representation.deleteBuffers();
    expect(actions.filter(action => action.type === 'labels')).toHaveLength(3);
    expect(state.glRef.labelBuffers).toStrictEqual(before);
  });

  it('leaves unrelated native texture updates and intentional mutable label refreshes unchanged', () => {
    expect.hasAssertions();
    const extra = `
      exports.refresh = (store, labels, textures) => {
        store.dispatch(require('../store/glRefSlice').setLabelBuffers(labels));
        store.dispatch(require('../store/glRefSlice').setTexturedShapes(textures));
      };`;
    const transformed = transformMoorhenLabels(nativeSource + extra);
    const { refresh, store, state, existingLabel, actions } = setup(transformed);
    const labels = state.glRef.labelBuffers;
    existingLabel.label.text = 'edited in place';
    const textures = [{ uuid: 'new texture' }];
    refresh(store, labels, textures);
    expect(actions.map(action => action.type)).toStrictEqual(['labels', 'textures']);
    expect(state.glRef.labelBuffers).toBe(labels);
    expect(state.glRef.labelBuffers[0].label.text).toBe('edited in place');
    expect(state.glRef.texturedShapes).toBe(textures);
  });
});
