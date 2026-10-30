import { useMemo, useSyncExternalStore } from 'react';
import { useStore } from 'react-redux';
import { DJANGO_CONTEXT } from '../../../utils/djangoContext';
import { QUALITY_STATUSES } from '../molecule/moleculeView/qualityStatus/constants';
import { postQualityStatuse } from '../molecule/moleculeView/qualityStatus/api/api';
import { addQualityStatusAction } from '../molecule/moleculeView/qualityStatus/api/apiActions';

const controllers = new WeakMap();
const grades = [QUALITY_STATUSES.GOOD, QUALITY_STATUSES.MEDIOCRE, QUALITY_STATUSES.BAD];

export const canGradeReview = () =>
  Boolean(DJANGO_CONTEXT?.pk) && DJANGO_CONTEXT.authenticated !== false && DJANGO_CONTEXT.username !== 'NOT_LOGGED_IN';

export const selectReviewMainStatus = (state, observationId) =>
  state.apiReducers.quality_statuses?.find(
    record =>
      record.site_observation === observationId && record.main_status === true && record.comment !== 'Created on load'
  )?.status || QUALITY_STATUSES.NONE;

const validResponse = (record, payload) =>
  record &&
  !Array.isArray(record) &&
  ['string', 'number'].includes(typeof record.id) &&
  Number.isInteger(Number(record.id)) &&
  Number(record.id) > 0 &&
  record.site_observation === payload.site_observation &&
  record.main_status === true &&
  record.status === payload.status &&
  String(record.user) === String(payload.user) &&
  record.comment !== 'Created on load';

// Per-store feedback and duplicate suppression survive closing/virtualizing cards, without entering snapshots.
export const createReviewStatusController = store => {
  const listeners = new Set();
  const requests = new Set();
  const pending = new Map();
  let snapshot = {};
  let target = store.getState().apiReducers.target_on;
  let generation = 0;
  let unsubscribe;
  const emit = () => listeners.forEach(listener => listener());
  const update = (key, value) => {
    snapshot = { ...snapshot, [key]: value };
    emit();
  };
  const checkTarget = () => {
    const next = store.getState().apiReducers.target_on;
    if (next !== target) {
      target = next;
      generation += 1;
      pending.clear();
      snapshot = {};
      emit();
    }
  };
  const watch = () => {
    if (!unsubscribe) unsubscribe = store.subscribe(checkTarget);
    checkTarget();
  };
  const stopWatching = () => {
    if (!listeners.size && !requests.size && unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  };
  const save = (observationId, status) => {
    watch();
    const key = String(observationId);
    if (pending.has(key)) return pending.get(key).promise;
    if (
      !canGradeReview() ||
      !grades.includes(status) ||
      observationId === undefined ||
      observationId === null ||
      selectReviewMainStatus(store.getState(), observationId) === status
    ) {
      stopWatching();
      return Promise.resolve(false);
    }
    const job = { generation };
    const payload = {
      status,
      site_observation: observationId,
      user: DJANGO_CONTEXT.pk,
      main_status: true,
      comment: 'Main status change'
    };
    const current = () => job.generation === generation && canGradeReview() && DJANGO_CONTEXT.pk === payload.user;
    pending.set(key, job);
    requests.add(job);
    job.promise = Promise.resolve()
      .then(async () => {
        if (!current()) return false;
        const record = await postQualityStatuse(payload);
        if (!current()) return false;
        if (!validResponse(record, payload)) throw new Error('The main status was not saved. Please try again.');
        store.dispatch(addQualityStatusAction(record));
        return true;
      })
      .catch(error => {
        if (current()) update(key, { pending: false, error: error.message || String(error) });
        return false;
      })
      .finally(() => {
        requests.delete(job);
        if (pending.get(key) === job) {
          pending.delete(key);
          if (!snapshot[key]?.error) update(key, { pending: false, error: null });
        }
        stopWatching();
      });
    update(key, { pending: true, error: null });
    return job.promise;
  };
  return {
    save,
    getSnapshot: () => snapshot,
    subscribe: listener => {
      listeners.add(listener);
      watch();
      return () => {
        listeners.delete(listener);
        stopWatching();
      };
    }
  };
};

export const useReviewMainStatus = observationId => {
  const store = useStore();
  const controller = useMemo(() => {
    if (!controllers.has(store)) controllers.set(store, createReviewStatusController(store));
    return controllers.get(store);
  }, [store]);
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  return { ...state[String(observationId)], save: status => controller.save(observationId, status) };
};
