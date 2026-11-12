const fs = require('fs');
const { runInNewContext } = require('vm');
const ts = require('typescript');
const { parse } = require('@babel/parser');
const { vec3, mat4 } = require('gl-matrix');
const picking = require('../js/viewer/nativePicking');
const { transformNativePicking } = require('./moorhenPickingLoader');
const { transformMoorhenLabels } = require('./moorhenLabelsLoader');
const { transformNativeBufferPublication } = require('./moorhenBuffersLoader');
const { transformMoorhenModels } = require('./moorhenModelsLoader');

const file = require.resolve('moorhen');
const bundle = fs.readFileSync(file, 'utf8');
const marker = bundle.lastIndexOf('sourceMappingURL=data:');
const map = JSON.parse(Buffer.from(bundle.slice(bundle.indexOf('base64,', marker) + 7), 'base64').toString());
const source = suffix => map.sourcesContent[map.sources.findIndex(name => name.endsWith(suffix))];
const compile = input =>
  ts.transpileModule(input, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 } })
    .outputText;

const fixture = () => {
  const maths = {};
  runInNewContext(compile(source('/src/WebGLgComponents/mgMaths.js')), {
    exports: maths,
    require: () => vec3,
    console
  });
  const original = source('/src/WebGLgComponents/mgWebGL.tsx');
  const start = original.indexOf('    getAtomFomMouseXY(');
  const method = original.slice(start, original.indexOf('    doHover(', start));
  const nativeBuilder = compile(source('/src/WebGLgComponents/buildBuffers.ts'));
  const patched = transformNativePicking(
    `(function(exports, require) { ${nativeBuilder} })(exports, require);` +
      compile(`export class Picking { ${method} }`)
  );
  const exports = {};
  const state = { glRef: { displayBuffers: [], glCtx: null }, mapContourSettings: { mapLineWidth: 1 } };
  let calls = 0;
  const distance = jest.fn(maths.DistanceBetweenPointAndLine);
  const context = {
    exports,
    performance: { now: () => 0 },
    vec3,
    mat4,
    store: { getState: () => state },
    getOffsetRect: () => ({ top: 0, left: 0 }),
    getDeviceScale: () => 1,
    vec3Create: maths.vec3Create,
    DistanceBetweenPointAndLine: distance,
    unProject: (_x, _y, _z, _mv, _p, _vp, result) => {
      result.push(0, 0, ++calls % 2 ? -10 : 10);
      return true;
    },
    require: name =>
      name.includes('mgMaths')
        ? maths
        : name.includes('gl-matrix/vec3')
        ? vec3
        : name.includes('gl-matrix/mat4')
        ? mat4
        : name.endsWith('nativePicking.js')
        ? picking
        : name.endsWith('MoorhenReduxStore')
        ? { default: { getState: () => state } }
        : {}
  };
  runInNewContext(patched + compile(`export class Baseline { ${method} }`), context);
  const renderer = Type =>
    Object.assign(new Type(), {
      canvas: { height: 200 },
      canvasRef: { current: {} },
      gl: { viewportWidth: 200, viewportHeight: 200 },
      mvMatrix: mat4.create(),
      pMatrix: mat4.create(),
      zoom: 1,
      fogClipOffset: 0,
      gl_clipPlane0: [0, 0, -1, 5],
      gl_clipPlane1: [0, 0, 1, 5]
    });
  return { state, distance, exports, baseline: renderer(exports.Baseline), accelerated: renderer(exports.Picking) };
};
const mesh = (atoms, extra = {}) => ({ atoms, symmetryAtoms: [], visible: true, clickTol: 1, ...extra });

describe('installed native picking build bridge', () => {
  it('composes with the other bridges and is registered in production and development', () => {
    expect.hasAssertions();
    const transformed = transformMoorhenModels(
      transformNativeBufferPublication(transformMoorhenLabels(transformNativePicking(bundle)))
    );
    expect(() => parse(transformed)).not.toThrow();
    expect(fs.readFileSync(file, 'utf8')).toBe(bundle);
    [require('../webpack.config'), require('../webpack.config-dev')].forEach(config => {
      expect(config.module.rules.find(rule => rule.test?.test(file)).use).toContain(
        require.resolve('./moorhenPickingLoader')
      );
    });
    expect(() => transformNativePicking('class Other {}')).toThrow('expected one');
  });

  it('preserves the native nearest hit, original buffer/atom indices, hidden objects, clipping and symmetry', () => {
    expect.hasAssertions();
    const { state, baseline, accelerated } = fixture();
    state.glRef.displayBuffers = [
      mesh([{ x: 100, y: 0, z: 0 }]),
      mesh([{ x: 0.8, y: 0, z: 0 }]),
      mesh([{ x: 0, y: 0, z: 0 }], { visible: false }),
      mesh([{ x: 0, y: 0, z: 20 }]),
      mesh([{ x: 300, y: 0, z: 0 }], { symmetryAtoms: [[{ pos: [0.1, 0, 0] }]] })
    ];
    const controller = new picking.NativePickingController(accelerated, () => {});
    controller.configure(true);
    const expected = baseline.getAtomFomMouseXY({ pageX: 100, pageY: 100 }, baseline);
    const actual = accelerated.getAtomFomMouseXY({ pageX: 100, pageY: 100 }, accelerated);
    expect(actual).toStrictEqual(expected);
    expect(actual.slice(0, 2)).toStrictEqual([4, 0]);
    controller.dispose();
  });

  it('uses the atom index within one large protein buffer while retaining tie order and invalidating native geometry edits', () => {
    expect.hasAssertions();
    const { state, baseline, accelerated, distance, exports } = fixture();
    const atoms = Array.from({ length: 20000 }, (_, i) => ({ x: i, y: 0, z: 0 }));
    atoms[0].x = 0.2;
    atoms[1].x = 0.2;
    const protein = mesh(atoms);
    protein.triangleVertexIndexBuffer = [];
    protein.nativeOwner = { protein };
    state.glRef.displayBuffers = [protein];
    const controller = new picking.NativePickingController(accelerated, () => {});
    controller.configure(true);
    const expected = baseline.getAtomFomMouseXY({ pageX: 100, pageY: 100 }, baseline);
    expect(distance).toHaveBeenCalledTimes(20000);
    distance.mockClear();
    expect(accelerated.getAtomFomMouseXY({ pageX: 100, pageY: 100 }, accelerated)).toStrictEqual(expected);
    expect(distance.mock.calls.length).toBeLessThan(20);
    expect(expected[1]).toBe(0);
    atoms[15000].x = 0;
    protein.isDirty = true;
    exports.buildBuffers([protein]);
    protein.isDirty = false;
    expect(accelerated.getAtomFomMouseXY({ pageX: 100, pageY: 100 }, accelerated)).toStrictEqual(
      baseline.getAtomFomMouseXY({ pageX: 100, pageY: 100 }, baseline)
    );
    expect(accelerated.getAtomFomMouseXY({ pageX: 100, pageY: 100 }, accelerated)[1]).toBe(15000);
    controller.dispose();
  });
});
