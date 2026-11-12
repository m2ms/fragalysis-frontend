import { NGL_OBJECTS } from './constants';
import { isMoleculeInputError } from '../../viewer/moleculeInputErrors';

const requestsByIntent = new WeakMap();
const listeners = new Set();
let current = null;
let snapshot = null;
let sequence = 0;
const now = () => performance.now();

export const getLigandActionTiming = () => snapshot;
export const subscribeLigandActionTiming = listener => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const notify = () => listeners.forEach(listener => listener());

const finish = (request, status) => {
  if (current !== request || snapshot?.status !== 'running') return;
  snapshot = Object.freeze({ ...snapshot, status, skippedCount: request.skippedCount, finishedAt: now() });
  request.records.clear();
  request.getState = null;
  notify();
};

// Only plain IDs, names and intent references are retained while timing. No
// timer values, promises or viewer handles enter Redux or saved snapshots.
export const beginLigandActionTiming = (kind, observations, getState) => {
  const startedAt = now();
  if (current) {
    current.records.clear();
    current.getState = null;
  }
  current = {
    kind,
    getState,
    publishing: true,
    failed: false,
    skippedCount: 0,
    cancelled: false,
    records: new Map(
      observations.map(observation => [
        observation.id,
        {
          name: `${observation.code || observation.virtual_name}_${NGL_OBJECTS.LIGAND}`,
          originals: new Set(),
          promises: new Set()
        }
      ])
    )
  };
  snapshot = Object.freeze({ sequence: ++sequence, kind, status: 'running', skippedCount: 0, startedAt, finishedAt: null });
  notify();
  return current;
};

export const bindLigandActionIntents = (request, items) => {
  if (current !== request || snapshot?.status !== 'running') return;
  items.forEach(item => {
    request.records.get(item.id)?.originals.add(item);
    requestsByIntent.set(item, request);
  });
};

export const reconcileLigandActionTiming = () => {
  const request = current;
  if (!request || request.publishing || snapshot?.status !== 'running') return;
  const state = request.getState();
  const intentsById = new Map();
  (state.selectionReducers?.toBeDisplayedList || []).forEach(item => {
    if (item.type !== NGL_OBJECTS.LIGAND) return;
    if (!intentsById.has(item.id)) intentsById.set(item.id, []);
    intentsById.get(item.id).push(item);
  });
  const objects = state.nglReducers?.objectsInView || {};
  request.records.forEach((record, id) => {
    if (record.promises.size > 0) return;
    const matching = intentsById.get(id) || [];
    const object = objects[record.name];
    const ready =
      object?.OBJECT_TYPE === 'LIGAND' &&
      object.moleculeId === id &&
      matching.some(item => item.display !== false && item.rendered === true);
    const stillOwned = matching.some(item => record.originals.has(item));
    const removing = matching.some(item => item.display === false);
    if (record.failed) {
      request.failed = true;
    } else if (record.skipped) {
      request.skippedCount++;
    } else if (request.kind === 'load') {
      // A cancellation may have queued disposal after the load. Keep timing
      // until its tombstone is acknowledged, even if the load just settled.
      if (removing) return;
      if (!ready && stillOwned && record.result !== 'cancelled') return;
      if (!ready) request.cancelled = true;
    } else {
      if (record.result !== 'removed' && (object || matching.length > 0)) {
        if (stillOwned) return;
        request.cancelled = true;
      }
    }
    request.records.delete(id);
  });
  if (request.records.size === 0)
    finish(request, request.failed ? 'failed' : request.cancelled ? 'cancelled' : 'completed');
};

export const publishLigandActionTiming = request => {
  if (current !== request) return;
  request.publishing = false;
  reconcileLigandActionTiming();
};

export const failLigandActionTiming = request => finish(request, 'failed');
export const cancelLigandActionTiming = () => {
  if (current) finish(current, 'cancelled');
};

export const trackLigandActionOperation = (item, promise) => {
  const assigned = requestsByIntent.get(item);
  // Individual removals can cancel part of the most recent bulk load. Include
  // their ordered disposal in that load's elapsed time without starting a timer.
  const request = assigned === current ? assigned : item.display === false ? current : null;
  const record = request?.records.get(item.id);
  if (!record || snapshot?.status !== 'running' || record.promises.has(promise)) return;
  record.promises.add(promise);
  const settled = (result, failed = false, skipped = false) => {
    if (current !== request || snapshot?.status !== 'running') return;
    record.promises.delete(promise);
    record.result = result;
    record.failed = record.failed || failed;
    record.skipped = record.skipped || skipped;
    reconcileLigandActionTiming();
  };
  promise.then(
    result => settled(result),
    error => {
      const skipped = request.kind === 'load' && item.display !== false && isMoleculeInputError(error);
      settled(undefined, !skipped, skipped);
    }
  );
};
