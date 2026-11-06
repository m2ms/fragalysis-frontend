import {
  beginLigandActionTiming,
  bindLigandActionIntents,
  cancelLigandActionTiming,
  getLigandActionTiming,
  publishLigandActionTiming,
  reconcileLigandActionTiming,
  subscribeLigandActionTiming,
  trackLigandActionOperation
} from './ligandActionTiming';

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((accept, fail) => {
    resolve = accept;
    reject = fail;
  });
  return { promise, resolve, reject };
};
const intent = (id = 1, display = true) => ({ id, type: 'LIGAND', display });
const object = id => ({ OBJECT_TYPE: 'LIGAND', moleculeId: id });
const begin = (kind = 'load', item = intent()) => {
  const state = { selectionReducers: { toBeDisplayedList: [item] }, nglReducers: { objectsInView: {} } };
  const request = beginLigandActionTiming(kind, [{ id: item.id, code: `obs-${item.id}` }], () => state);
  bindLigandActionIntents(request, [item]);
  return { state, request, item };
};

describe('bulk ligand action timing', () => {
  // eslint-disable-next-line jest/no-hooks
  beforeEach(() => {
    jest.useFakeTimers();
  });

  // eslint-disable-next-line jest/no-hooks
  afterEach(() => {
    cancelLigandActionTiming();
    jest.useRealTimers();
  });

  it('includes publication and queued work, and retains the exact final time after rendering', async () => {
    expect.hasAssertions();
    const changes = jest.fn();
    const unsubscribe = subscribeLigandActionTiming(changes);
    const { state, request, item } = begin();
    const native = deferred();
    jest.advanceTimersByTime(100);
    publishLigandActionTiming(request);
    trackLigandActionOperation(item, native.promise);
    trackLigandActionOperation(item, native.promise);
    jest.advanceTimersByTime(1134);
    expect(getLigandActionTiming().status).toBe('running');
    state.selectionReducers.toBeDisplayedList = [{ ...item, rendered: true }];
    state.nglReducers.objectsInView['obs-1_LIGAND'] = object(1);
    native.resolve('rendered');
    await native.promise;
    const finished = getLigandActionTiming();
    expect(finished.status).toBe('completed');
    expect(finished.finishedAt - finished.startedAt).toBe(1234);
    jest.advanceTimersByTime(10000);
    expect(getLigandActionTiming()).toBe(finished);
    expect(changes).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it('keeps removal running until native disposal and its queue acknowledgement', async () => {
    expect.hasAssertions();
    const { state, request, item } = begin('remove', intent(1, false));
    state.nglReducers.objectsInView['obs-1_LIGAND'] = object(1);
    const disposal = deferred();
    trackLigandActionOperation(item, disposal.promise);
    publishLigandActionTiming(request);
    jest.advanceTimersByTime(750);
    expect(getLigandActionTiming().status).toBe('running');
    state.selectionReducers.toBeDisplayedList = [];
    state.nglReducers.objectsInView = {};
    disposal.resolve('removed');
    await disposal.promise;
    expect(getLigandActionTiming().status).toBe('completed');
    expect(getLigandActionTiming().finishedAt - getLigandActionTiming().startedAt).toBe(750);
  });

  it('waits for an individual cancellation to dispose the active bulk ligand', async () => {
    expect.hasAssertions();
    const { state, request, item } = begin();
    const loading = deferred();
    const disposal = deferred();
    trackLigandActionOperation(item, loading.promise);
    publishLigandActionTiming(request);
    const tombstone = { ...item, display: false };
    state.selectionReducers.toBeDisplayedList = [tombstone];
    trackLigandActionOperation(tombstone, disposal.promise);
    state.nglReducers.objectsInView['obs-1_LIGAND'] = object(1);
    loading.resolve('rendered');
    await loading.promise;
    jest.advanceTimersByTime(300);
    expect(getLigandActionTiming().status).toBe('running');
    state.selectionReducers.toBeDisplayedList = [];
    state.nglReducers.objectsInView = {};
    disposal.resolve('removed');
    await disposal.promise;
    expect(getLigandActionTiming().status).toBe('cancelled');
  });

  it('stops unstarted work when snapshot intent is replaced', () => {
    expect.hasAssertions();
    const { state, request } = begin();
    publishLigandActionTiming(request);
    jest.advanceTimersByTime(450);
    state.selectionReducers.toBeDisplayedList = [];
    reconcileLigandActionTiming();
    expect(getLigandActionTiming().status).toBe('cancelled');
    expect(getLigandActionTiming().finishedAt - getLigandActionTiming().startedAt).toBe(450);
  });

  it('finishes duplicate requests for an already acknowledged viewer object without creating work', () => {
    expect.hasAssertions();
    const { state, request, item } = begin();
    state.selectionReducers.toBeDisplayedList.unshift({ ...item, rendered: true });
    state.nglReducers.objectsInView['obs-1_LIGAND'] = object(1);
    publishLigandActionTiming(request);
    expect(getLigandActionTiming().status).toBe('completed');
  });

  it('reports a native failure after the operation settles', async () => {
    expect.hasAssertions();
    const { state, request, item } = begin();
    const operation = deferred();
    trackLigandActionOperation(item, operation.promise);
    publishLigandActionTiming(request);
    state.selectionReducers.toBeDisplayedList = [];
    operation.reject(new Error('native failure'));
    await operation.promise.catch(() => {});
    expect(getLigandActionTiming().status).toBe('failed');
  });

  it('does not let an old completion overwrite a later action', async () => {
    expect.hasAssertions();
    const old = begin();
    const operation = deferred();
    trackLigandActionOperation(old.item, operation.promise);
    publishLigandActionTiming(old.request);
    const latest = begin('remove', intent(2, false));
    latest.state.nglReducers.objectsInView['obs-2_LIGAND'] = object(2);
    publishLigandActionTiming(latest.request);
    const snapshot = getLigandActionTiming();
    operation.resolve('rendered');
    await operation.promise;
    expect(getLigandActionTiming()).toBe(snapshot);
    expect(getLigandActionTiming().kind).toBe('remove');
  });
});
