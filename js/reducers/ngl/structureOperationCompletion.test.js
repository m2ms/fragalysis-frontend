import { observeStructureOperation, completeStructureOperation } from './structureOperationCompletion';
import { createStructureOperationQueue } from './useStructureOperationQueue';

const deferred = () => {
  let resolve;
  const promise = new Promise(accept => {
    resolve = accept;
  });
  return { promise, resolve };
};

describe('transient rendering completion receipts', () => {
  it('waits for the latest claimed reload rather than an earlier same-name load acknowledgement', async () => {
    expect.hasAssertions();
    const store = { getState: () => ({ apiReducers: { target_on: 1 } }) };
    const run = createStructureOperationQueue(store);
    const item = { id: 1, type: 'LIGAND', display: true };
    const loading = deferred();
    const deleting = deferred();
    const reloading = deferred();
    const removeStarted = deferred();
    const reloadStarted = deferred();
    const first = run(item, () => loading.promise);
    run({ ...item, display: false }, () => {
      removeStarted.resolve();
      return deleting.promise;
    });
    const last = run(item, () => {
      reloadStarted.resolve();
      return reloading.promise;
    });
    const receipt = observeStructureOperation(store, item);
    let finished = false;
    receipt.promise.then(() => {
      finished = true;
    });
    loading.resolve();
    await first;
    await removeStarted.promise;
    expect(finished).toBe(false);
    deleting.resolve();
    await reloadStarted.promise;
    expect(finished).toBe(false);
    reloading.resolve();
    await last;
    await receipt.promise;
    expect(finished).toBe(true);
  });

  it('isolates stores, targets, datasets and opposite intents, without retaining a receipt after completion', async () => {
    expect.hasAssertions();
    const state = { apiReducers: { target_on: 1 } };
    const store = { getState: () => state };
    const otherStore = { getState: () => state };
    const load = { id: 7, type: 'LIGAND', display: true };
    const first = observeStructureOperation(store, load);
    const dataset = observeStructureOperation(store, { ...load, datasetID: '10' });
    state.apiReducers.target_on = 2;
    const second = observeStructureOperation(store, load);
    let newTargetComplete = false;
    second.promise.then(() => {
      newTargetComplete = true;
    });
    completeStructureOperation(otherStore, 2, load);
    completeStructureOperation(store, 2, { ...load, display: false });
    completeStructureOperation(store, 1, load);
    await first.promise;
    first.cancel();
    expect(newTargetComplete).toBe(false);
    completeStructureOperation(store, 1, { ...load, datasetID: '10' });
    await dataset.promise;
    completeStructureOperation(store, 2, load);
    await second.promise;
    expect(newTargetComplete).toBe(true);
    const next = observeStructureOperation(store, load);
    second.cancel();
    completeStructureOperation(store, 2, load);
    await next.promise;
  });

  it('clears pending receipts on errors, timeout and repeated cancellation so a retry can complete', async () => {
    expect.hasAssertions();
    jest.useFakeTimers();
    const store = { getState: () => ({ apiReducers: { target_on: 1 } }) };
    const item = { id: 1, type: 'LIGAND', display: true };
    try {
      const failed = observeStructureOperation(store, item, 1000);
      completeStructureOperation(store, 1, item, new Error('render failed'));
      await expect(failed.promise).rejects.toThrow('render failed');
      const timed = observeStructureOperation(store, item, 1000);
      jest.advanceTimersByTime(1000);
      await expect(timed.promise).rejects.toThrow('Timed out');
      const cancelled = observeStructureOperation(store, item, 1000);
      cancelled.cancel();
      cancelled.cancel();
      await expect(cancelled.promise).rejects.toThrow('cancelled');
      const retry = observeStructureOperation(store, item, 1000);
      completeStructureOperation(store, 1, item);
      await retry.promise;
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });
});
