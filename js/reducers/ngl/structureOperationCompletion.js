// Transient completion receipts. Keep promises and errors out of serialized queue/snapshot payloads.
const observers = new WeakMap();
const operations = new WeakMap();
const operationKey = (target, item) => `${target}:${item.datasetID ?? ''}:${item.type}:${item.id}`;
const keyFor = (target, item) => `${operationKey(target, item)}:${item.display !== false}`;

export const observeStructureOperation = (store, item, timeout = 60000) => {
  const key = keyFor(store.getState().apiReducers.target_on, item);
  const byKey = observers.get(store) || new Map();
  observers.set(store, byKey);
  const waiting = byKey.get(key) || new Set();
  byKey.set(key, waiting);
  let finish;
  let timer;
  let settled = false;
  const promise = new Promise((resolve, reject) => {
    finish = error => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      waiting.delete(finish);
      if (!waiting.size) byKey.delete(key);
      if (!byKey.size) observers.delete(store);
      if (error) reject(error);
      else resolve();
    };
    waiting.add(finish);
    const running = operations.get(store)?.get(operationKey(store.getState().apiReducers.target_on, item));
    if (running?.display === (item.display !== false)) finish.operation = running.promise;
    timer = setTimeout(() => finish(new Error('Timed out waiting for the ligand rendering operation.')), timeout);
  });
  // A synchronous enqueue failure/cancellation can occur before the caller reaches its await.
  promise.catch(() => {});
  return { promise, cancel: () => finish(new Error('Ligand operation cancelled.')) };
};

export const claimStructureOperation = (store, target, item, promise) => {
  const byKey = operations.get(store) || new Map();
  operations.set(store, byKey);
  byKey.set(operationKey(target, item), { display: item.display !== false, promise });
  const waiting = observers.get(store)?.get(keyFor(target, item));
  [...(waiting || [])].forEach(finish => {
    if (!finish.operation) finish.operation = promise;
  });
};

export const completeStructureOperation = (store, target, item, error, promise) => {
  const byKey = operations.get(store);
  const running = byKey?.get(operationKey(target, item));
  if (running && running.promise === promise) {
    byKey.delete(operationKey(target, item));
    if (!byKey.size) operations.delete(store);
  }
  const waiting = observers.get(store)?.get(keyFor(target, item));
  [...(waiting || [])].forEach(finish => {
    if (!promise || finish.operation === promise) finish(error);
  });
};
