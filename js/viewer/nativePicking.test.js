import {
  NativePickingController,
  bufferMayContainPickedAtom,
  getAtomPickCandidates,
  invalidateDirtyPickingBounds
} from './nativePicking';

const point = (x, y, z) => ({ x, y, z });
const buffer = atoms => ({ atoms, symmetryAtoms: [], isDirty: false });
const front = [0, 0, -10];
const back = [0, 0, 10];

describe('native picking broad phase and hover sampling', () => {
  it('rejects distant buffers while retaining possible hits, symmetry and an exact tolerance boundary', () => {
    expect.hasAssertions();
    const renderer = {};
    const controller = new NativePickingController(renderer, () => {});
    const distant = buffer([point(100, 100, 0)]);
    expect(bufferMayContainPickedAtom(renderer, distant, front, back, 1)).toBe(true);
    controller.configure(true);
    expect(bufferMayContainPickedAtom(renderer, distant, front, back, 1)).toBe(false);
    expect(bufferMayContainPickedAtom(renderer, buffer([point(1, 0, 0)]), front, back, 1)).toBe(true);
    distant.symmetryAtoms = [[{ pos: [0, 0, 0] }]];
    expect(bufferMayContainPickedAtom(renderer, distant, front, back, 1)).toBe(true);
    controller.dispose();
    expect(bufferMayContainPickedAtom(renderer, distant, front, back, 1)).toBe(true);
  });

  it('invalidates replaced atom arrays and dirty in-place geometry after the native builder clears isDirty', () => {
    expect.hasAssertions();
    const renderer = {};
    const controller = new NativePickingController(renderer, () => {});
    controller.configure(true);
    const mesh = buffer([point(100, 0, 0)]);
    mesh.owner = { mesh };
    expect(bufferMayContainPickedAtom(renderer, mesh, front, back, 1)).toBe(false);
    mesh.atoms = [point(0, 0, 0)];
    expect(bufferMayContainPickedAtom(renderer, mesh, front, back, 1)).toBe(true);
    mesh.atoms[0].x = 100;
    mesh.isDirty = true;
    invalidateDirtyPickingBounds([mesh]);
    mesh.isDirty = false;
    expect(bufferMayContainPickedAtom(renderer, mesh, front, back, 1)).toBe(false);
    mesh.atoms.push(point(0, 0, 0));
    expect(bufferMayContainPickedAtom(renderer, mesh, front, back, 1)).toBe(true);
    controller.dispose();
  });

  it('falls back conservatively for incomplete metadata, degenerate rays and non-finite data', () => {
    expect.hasAssertions();
    const renderer = {};
    const controller = new NativePickingController(renderer, () => {});
    controller.configure(true);
    for (const mesh of [{}, buffer([]), buffer([point(NaN, 0, 0)])]) {
      expect(bufferMayContainPickedAtom(renderer, mesh, front, back, 1)).toBe(true);
    }
    const mesh = buffer([point(100, 0, 0)]);
    expect(bufferMayContainPickedAtom(renderer, mesh, front, front, 1)).toBe(true);
    expect(bufferMayContainPickedAtom(renderer, mesh, front, [0, 0, -10 + 1e-8], 1)).toBe(true);
    expect(getAtomPickCandidates(renderer, mesh, front, [0, 0, -10 + 1e-8], 1)).toBeNull();
    expect(bufferMayContainPickedAtom(renderer, mesh, front, back, Infinity)).toBe(true);
    controller.dispose();
  });

  it('refreshes symmetry groups and atom indices after native edits without copying atom records', () => {
    expect.hasAssertions();
    const renderer = {};
    const controller = new NativePickingController(renderer, () => {});
    controller.configure(true);
    const mesh = buffer([point(100, 0, 0)]);
    mesh.symmetryAtoms = [[]];
    expect(bufferMayContainPickedAtom(renderer, mesh, front, back, 1)).toBe(false);
    mesh.symmetryAtoms[0].push({ pos: [0, 0, 0] });
    expect(bufferMayContainPickedAtom(renderer, mesh, front, back, 1)).toBe(true);
    const atoms = mesh.atoms;
    expect(getAtomPickCandidates(renderer, mesh, front, back, 1)).toHaveLength(0);
    atoms[0].x = 0;
    mesh.isDirty = true;
    invalidateDirtyPickingBounds([mesh]);
    mesh.isDirty = false;
    expect(getAtomPickCandidates(renderer, mesh, front, back, 1)).toStrictEqual([0]);
    expect(mesh.atoms).toBe(atoms);
    mesh.transformMatrixInteractive = new Float32Array(16);
    expect(getAtomPickCandidates(renderer, mesh, front, back, 1)).toBeNull();
    controller.dispose();
  });

  it('reduces a dispersed 930-buffer pick to nearby atom tests without changing potential hits', () => {
    expect.hasAssertions();
    const renderer = {};
    const controller = new NativePickingController(renderer, () => {});
    controller.configure(true);
    const scene = Array.from({ length: 930 }, (_, index) =>
      buffer(Array.from({ length: 30 }, (_, atom) => point(index * 100, 0, atom)))
    );
    const candidates = scene.filter(mesh => bufferMayContainPickedAtom(renderer, mesh, front, back, 1));
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toBe(scene[0]);
    expect(candidates.flatMap(mesh => mesh.atoms)).toHaveLength(30);
    controller.dispose();
  });

  it('samples the latest hover per frame, keeps clicks synchronous and cancels stale hover on mouse down/leave', () => {
    expect.hasAssertions();
    jest.useFakeTimers();
    const frames = new Map();
    let sequence = 0;
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      frames.set(++sequence, callback);
      return sequence;
    });
    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => frames.delete(id));
    const canvas = document.createElement('canvas');
    const hit = { atom: point(0, 0, 0) };
    const renderer = { canvas, doHover: jest.fn(), doMouseDown: jest.fn(), getAtomFomMouseXY: jest.fn(() => hit) };
    const flush = jest.fn();
    const nativeHover = renderer.doHover;
    const nativePick = renderer.getAtomFomMouseXY;
    const controller = new NativePickingController(renderer, flush);
    controller.configure(true);
    for (let i = 0; i < 100; i++) renderer.doHover({ pageX: i, pageY: 3 }, renderer);
    expect(nativeHover).not.toHaveBeenCalled();
    [...frames.values()].forEach(callback => callback());
    expect(nativeHover).toHaveBeenCalledTimes(1);
    expect(nativeHover.mock.calls[0][0]).toMatchObject({ pageX: 99, pageY: 3 });
    expect(renderer.getAtomFomMouseXY({ pageX: 4 }, renderer)).toBe(hit);
    expect(flush).toHaveBeenCalledTimes(1);
    expect(nativePick).toHaveBeenCalledTimes(1);
    renderer.doHover({ pageX: 2 }, renderer);
    renderer.doMouseDown({}, renderer);
    jest.runOnlyPendingTimers();
    expect(nativeHover).toHaveBeenCalledTimes(1);
    renderer.doHover({ pageX: 3 }, renderer);
    canvas.dispatchEvent(new MouseEvent('mouseleave'));
    jest.runOnlyPendingTimers();
    expect(nativeHover).toHaveBeenCalledTimes(1);
    controller.dispose();
    expect(renderer.doHover).toBe(nativeHover);
    expect(renderer.getAtomFomMouseXY).toBe(nativePick);
    jest.useRealTimers();
  });
});
