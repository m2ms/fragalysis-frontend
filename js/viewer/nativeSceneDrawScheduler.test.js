import { NativeSceneDrawScheduler } from './nativeSceneDrawScheduler';

describe('native scene draw scheduling', () => {
  // eslint-disable-next-line jest/no-hooks
  beforeEach(() => jest.useFakeTimers());

  // eslint-disable-next-line jest/no-hooks
  afterEach(() => jest.useRealTimers());

  const setup = () => {
    const frames = new Map();
    let sequence = 0;
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      frames.set(++sequence, callback);
      return sequence;
    });
    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => frames.delete(id));
    const draw = jest.fn();
    const immediate = jest.fn(() => false);
    const scheduler = new NativeSceneDrawScheduler(draw, immediate);
    return { scheduler, draw, immediate, frame: () => [...frames.values()].forEach(callback => callback()) };
  };

  it('draws immediately with the option off, and coalesces native requests to the latest frame', () => {
    expect.hasAssertions();
    const { scheduler, draw, frame } = setup();
    scheduler.request('off');
    expect(draw).toHaveBeenCalledWith('off');
    draw.mockClear();
    scheduler.configure(true);
    for (let i = 0; i < 930; i++) scheduler.request(i);
    expect(draw).not.toHaveBeenCalled();
    frame();
    expect(draw.mock.calls).toStrictEqual([[929]]);
    jest.runOnlyPendingTimers();
    expect(draw).toHaveBeenCalledTimes(1);
  });

  it('forces a current frame for immediate operations and cancels the stale queued request', () => {
    expect.hasAssertions();
    const { scheduler, draw, immediate, frame } = setup();
    scheduler.configure(true);
    scheduler.request('store');
    immediate.mockReturnValue(true);
    scheduler.request('camera');
    expect(draw.mock.calls).toStrictEqual([['camera']]);
    frame();
    jest.runOnlyPendingTimers();
    expect(draw).toHaveBeenCalledTimes(1);
    immediate.mockReturnValue(false);
    scheduler.request('store again');
    scheduler.drawNow('capture');
    expect(draw).toHaveBeenLastCalledWith('capture');
    expect(scheduler.pending).toBeNull();
  });

  it('has a fallback when frames are throttled and flushes when disabled', () => {
    expect.hasAssertions();
    const { scheduler, draw } = setup();
    scheduler.configure(true, 100);
    scheduler.request();
    jest.advanceTimersByTime(99);
    expect(draw).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(draw).toHaveBeenCalledTimes(1);
    scheduler.request('disable');
    scheduler.configure(false);
    expect(draw).toHaveBeenLastCalledWith('disable');
    expect(scheduler.pending).toBeNull();
  });

  it('propagates a forced draw failure and releases its scheduled callbacks', () => {
    expect.hasAssertions();
    const { scheduler, draw, frame } = setup();
    scheduler.configure(true);
    scheduler.request();
    const error = new Error('native draw failed');
    draw.mockImplementation(() => {
      throw error;
    });
    expect(() => scheduler.drawNow()).toThrow(error);
    frame();
    jest.runOnlyPendingTimers();
    expect(draw).toHaveBeenCalledTimes(1);
    expect(scheduler.pending).toBeNull();
  });
});
