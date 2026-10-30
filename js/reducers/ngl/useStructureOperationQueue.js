import { useMemo } from 'react';
import { useStore } from 'react-redux';
import { claimStructureOperation, completeStructureOperation } from './structureOperationCompletion';

export const createStructureOperationQueue = store => {
  const operations = new Map();
  return (item, operation) => {
    const key = `${item.datasetID ?? ''}:${item.type}:${item.id}`;
    const previous = operations.get(key);
    // Effects can run again while coordinates are still being fetched, before
    // the display list acknowledges the load. Claim that work synchronously.
    if (previous && previous.display === item.display) return previous.promise;
    const entry = { display: item.display };
    const target = store?.getState().apiReducers?.target_on;
    entry.promise = Promise.resolve(previous?.promise)
      .catch(() => undefined)
      .then(() => operation(item));
    operations.set(key, entry);
    if (store) claimStructureOperation(store, target, item, entry.promise);
    const clear = () => {
      if (operations.get(key) === entry) operations.delete(key);
    };
    entry.promise.then(
      () => {
        clear();
        if (store) completeStructureOperation(store, target, item, undefined, entry.promise);
      },
      error => {
        clear();
        if (store) completeStructureOperation(store, target, item, error, entry.promise);
        console.error('Unable to update displayed structure', error);
      }
    );
    return entry.promise;
  };
};

export const useStructureOperationQueue = () => {
  const store = useStore();
  return useMemo(() => createStructureOperationQueue(store), [store]);
};
