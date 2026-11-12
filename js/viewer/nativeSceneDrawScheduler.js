// Native store effects can request many copies of the same scene frame. The
// adapter supplies the real draw boundary; readiness/camera/capture can force it.
export class NativeSceneDrawScheduler {
  constructor(draw, immediate = () => false) {
    this.draw = draw;
    this.immediate = immediate;
    this.enabled = false;
    this.maxWaitMs = 100;
    this.pending = null;
  }

  configure(enabled, maxWaitMs = 100) {
    this.enabled = enabled;
    this.maxWaitMs = maxWaitMs;
    if (!enabled) this.flush();
  }

  request(...args) {
    if (!this.enabled || this.immediate()) return this.drawNow(...args);
    if (this.pending) {
      this.pending.args = args;
      return;
    }
    const pending = { args };
    this.pending = pending;
    if (typeof requestAnimationFrame === 'function') pending.frame = requestAnimationFrame(() => this.flush());
    pending.timer = setTimeout(() => this.flush(), this.maxWaitMs);
  }

  cancel() {
    const pending = this.pending;
    this.pending = null;
    if (pending?.frame != null) cancelAnimationFrame(pending.frame);
    if (pending) clearTimeout(pending.timer);
    return pending;
  }

  flush() {
    const pending = this.cancel();
    if (pending) return this.draw(...pending.args);
  }

  drawNow(...args) {
    this.cancel();
    return this.draw(...args);
  }
}
