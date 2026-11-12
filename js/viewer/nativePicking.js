const enabledRenderers = new WeakSet();
const boundsCache = new WeakMap();
const atomIndexCache = new WeakMap();
const rayCache = new WeakMap();

const pickingRay = (renderer, front, back) => {
  const previous = rayCache.get(renderer);
  if (
    previous &&
    front[0] === previous.coordinates[0] &&
    front[1] === previous.coordinates[1] &&
    front[2] === previous.coordinates[2] &&
    back[0] === previous.coordinates[3] &&
    back[1] === previous.coordinates[4] &&
    back[2] === previous.coordinates[5]
  )
    return previous;
  const coordinates = [front[0], front[1], front[2], back[0], back[1], back[2]];
  // Match the native Float32 clone/subtract used by DistanceBetweenPointAndLine.
  const direction = back.slice(0, 3).map((value, axis) => Math.fround(Math.fround(value) - front[axis]));
  const lengthSquared = direction.reduce((sum, value) => sum + value * value, 0);
  const ray = {
    coordinates,
    front: coordinates.slice(0, 3),
    direction,
    lengthSquared,
    scale: Math.max(1, ...coordinates.map(Math.abs)),
    valid: Number.isFinite(lengthSquared) && lengthSquared > 1e-12
  };
  rayCache.set(renderer, ray);
  return ray;
};

const intersects = (bounds, ray, tolerance) => {
  if (!ray.valid || !bounds.valid || !Number.isFinite(bounds.radius) || !Number.isFinite(Number(tolerance)))
    return true;
  const [dx, dy, dz] = ray.direction;
  const x = bounds.center[0] - ray.front[0],
    y = bounds.center[1] - ray.front[1],
    z = bounds.center[2] - ray.front[2];
  const cx = y * dz - z * dy,
    cy = z * dx - x * dz,
    cz = x * dy - y * dx;
  const distanceSquared = (cx * cx + cy * cy + cz * cz) / ray.lengthSquared;
  const epsilon =
    1e-5 *
    Math.max(
      ray.scale,
      bounds.radius,
      Math.abs(bounds.center[0]),
      Math.abs(bounds.center[1]),
      Math.abs(bounds.center[2])
    );
  const radius = bounds.radius + Math.max(0, Number(tolerance)) + epsilon;
  return !Number.isFinite(distanceSquared) || distanceSquared <= radius * radius;
};

// Called before native GPU rebuilding clears isDirty. Bounds also track array
// replacements, as native atom and symmetry updates replace those arrays.
export const invalidateDirtyPickingBounds = buffers => {
  buffers.forEach(buffer => {
    if (buffer.isDirty) {
      boundsCache.delete(buffer);
      atomIndexCache.delete(buffer);
    }
  });
};

export const bufferMayContainPickedAtom = (renderer, buffer, front, back, tolerance) => {
  if (!enabledRenderers.has(renderer)) return true;
  const atoms = buffer.atoms;
  const symmetry = buffer.symmetryAtoms;
  if (buffer.transformMatrix || buffer.transformMatrixInteractive) return true;
  if (!atoms || !symmetry || !Number.isFinite(Number(tolerance))) return true;
  let bounds = boundsCache.get(buffer);
  if (
    !bounds ||
    bounds.atoms !== atoms ||
    bounds.symmetry !== symmetry ||
    bounds.atomCount !== atoms.length ||
    bounds.symmetryCount !== symmetry.length ||
    symmetry.some(
      (group, index) => bounds.groups[index]?.group !== group || bounds.groups[index]?.length !== group.length
    ) ||
    buffer.isDirty
  ) {
    const minimum = [Infinity, Infinity, Infinity];
    const maximum = [-Infinity, -Infinity, -Infinity];
    let valid = true;
    const include = (x, y, z) => {
      if (![x, y, z].every(Number.isFinite)) {
        valid = false;
        return;
      }
      minimum[0] = Math.min(minimum[0], x);
      maximum[0] = Math.max(maximum[0], x);
      minimum[1] = Math.min(minimum[1], y);
      maximum[1] = Math.max(maximum[1], y);
      minimum[2] = Math.min(minimum[2], z);
      maximum[2] = Math.max(maximum[2], z);
    };
    atoms.forEach(atom => include(atom.x, atom.y, atom.z));
    symmetry.forEach(group =>
      group.forEach(atom => {
        if (atom.pos?.length >= 3) include(...atom.pos);
        else valid = false;
      })
    );
    const center = minimum.map((value, axis) => (value + maximum[axis]) / 2);
    const radius = Math.hypot(...minimum.map((value, axis) => maximum[axis] - value)) / 2;
    bounds = {
      atoms,
      symmetry,
      atomCount: atoms.length,
      symmetryCount: symmetry.length,
      groups: symmetry.map(group => ({ group, length: group.length })),
      center,
      radius,
      valid
    };
    boundsCache.set(buffer, bounds);
  }
  return intersects(bounds, pickingRay(renderer, front, back), tolerance);
};

// The index contains primitive atom indices and bounds, never copies of native
// molecules or buffers. Ascending candidates preserve native nearest-hit ties.
export const getAtomPickCandidates = (renderer, buffer, front, back, tolerance) => {
  if (!enabledRenderers.has(renderer) || buffer.transformMatrix || buffer.transformMatrixInteractive || !buffer.atoms)
    return null;
  const ray = pickingRay(renderer, front, back);
  if (!ray.valid || !Number.isFinite(Number(tolerance))) return null;
  const atoms = buffer.atoms;
  let index = atomIndexCache.get(buffer);
  if (!index || index.atoms !== atoms || index.count !== atoms.length || buffer.isDirty) {
    let valid = true;
    const keys = ['x', 'y', 'z'];
    const build = indices => {
      const minimum = [Infinity, Infinity, Infinity],
        maximum = [-Infinity, -Infinity, -Infinity];
      indices.forEach(i =>
        keys.forEach((key, axis) => {
          const value = atoms[i][key];
          if (!Number.isFinite(value)) valid = false;
          minimum[axis] = Math.min(minimum[axis], value);
          maximum[axis] = Math.max(maximum[axis], value);
        })
      );
      const spans = minimum.map((value, axis) => maximum[axis] - value);
      const node = {
        valid: true,
        center: minimum.map((value, axis) => (value + maximum[axis]) / 2),
        radius: Math.hypot(...spans) / 2
      };
      if (indices.length <= 8 || !valid) return { ...node, indices };
      const axis = spans.indexOf(Math.max(...spans));
      indices.sort((a, b) => atoms[a][keys[axis]] - atoms[b][keys[axis]]);
      const middle = Math.floor(indices.length / 2);
      return { ...node, left: build(indices.slice(0, middle)), right: build(indices.slice(middle)) };
    };
    const root = atoms.length ? build(Array.from({ length: atoms.length }, (_, i) => i)) : null;
    index = { atoms, count: atoms.length, root, valid };
    atomIndexCache.set(buffer, index);
  }
  if (!index.valid) return null;
  const candidates = [];
  const visit = node => {
    if (!node || !intersects(node, ray, tolerance)) return;
    if (node.indices) candidates.push(...node.indices);
    else {
      visit(node.left);
      visit(node.right);
    }
  };
  visit(index.root);
  return candidates.sort((a, b) => a - b);
};

export class NativePickingController {
  constructor(renderer, beforePick) {
    this.renderer = renderer;
    this.enabled = false;
    this.pending = null;
    this.hover = renderer.doHover;
    this.mouseDown = renderer.doMouseDown;
    this.pick = renderer.getAtomFomMouseXY;
    this.hoverWrapper = (event, self) => {
      if (!this.enabled) return this.hover.call(renderer, event, self);
      const sample = { pageX: event.pageX, pageY: event.pageY, clientX: event.clientX, clientY: event.clientY };
      if (this.pending) {
        this.pending.event = sample;
        return;
      }
      const pending = { event: sample, self };
      this.pending = pending;
      const run = () => {
        if (this.pending !== pending) return;
        this.cancel();
        if (!renderer.mouseDown) this.hover.call(renderer, pending.event, pending.self);
      };
      if (typeof requestAnimationFrame === 'function') pending.frame = requestAnimationFrame(run);
      pending.timer = setTimeout(run, 100);
    };
    this.mouseDownWrapper = (...args) => {
      this.cancel();
      return this.mouseDown.apply(renderer, args);
    };
    this.pickWrapper = (...args) => {
      beforePick();
      return this.pick.apply(renderer, args);
    };
    if (this.hover) renderer.doHover = this.hoverWrapper;
    if (this.mouseDown) renderer.doMouseDown = this.mouseDownWrapper;
    if (this.pick) renderer.getAtomFomMouseXY = this.pickWrapper;
    this.canvas = renderer.canvas || renderer.canvasRef?.current;
    this.leave = () => this.cancel();
    this.canvas?.addEventListener?.('mouseleave', this.leave);
  }

  configure(enabled) {
    this.enabled = enabled;
    if (enabled) enabledRenderers.add(this.renderer);
    else {
      enabledRenderers.delete(this.renderer);
      this.cancel();
    }
  }

  cancel() {
    const pending = this.pending;
    this.pending = null;
    if (pending?.frame != null) cancelAnimationFrame(pending.frame);
    if (pending) clearTimeout(pending.timer);
  }

  dispose() {
    this.configure(false);
    rayCache.delete(this.renderer);
    if (this.renderer.doHover === this.hoverWrapper) this.renderer.doHover = this.hover;
    if (this.renderer.doMouseDown === this.mouseDownWrapper) this.renderer.doMouseDown = this.mouseDown;
    if (this.renderer.getAtomFomMouseXY === this.pickWrapper) this.renderer.getAtomFomMouseXY = this.pick;
    this.canvas?.removeEventListener?.('mouseleave', this.leave);
  }
}
