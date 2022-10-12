import { updateSnapshotCache, appendToActionsCache } from './actions';
import { base_url } from '../../components/routes/constants';
import { api } from '../../../js/utils/api';

export const getSnapshot = snapshotId => async (dispatch, getState) => {
  const state = getState();
  const snapshotCache = state.apiReducers.snapshots_cache;
  const snapshot = snapshotCache[snapshotId];
  if (snapshot) {
    return snapshot.snapshot_data;
  } else {
    const snapshotResponse = await api({ url: `${base_url}/api/snapshots/${snapshotId}` });
    dispatch(updateSnapshotCache(snapshotId, snapshotResponse.data));
    return snapshotResponse.data;
  }
};

export const getActions = snapshotId => async (dispatch, getState) => {
  const state = getState();
  const actionsCache = state.apiReducers.actions_cache;
  const actions = actionsCache[snapshotId];
  if (actions) {
    return actions;
  } else {
    const actionsResponse = await api({
      url: `${base_url}/api/snapshot-actions/?snapshot=${snapshotId}`
    });

    let listToSet = [];
    actionsResponse.data.results.forEach(r => {
      let resultActions = JSON.parse(r.actions);
      listToSet.push(...resultActions);
    });
    let snapshotActions = [...listToSet];

    dispatch(appendToActionsCache(snapshotId, snapshotActions));
    return snapshotActions;
  }
};
