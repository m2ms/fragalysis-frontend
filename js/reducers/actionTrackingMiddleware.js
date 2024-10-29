import { constants as datasetConstants } from '../components/datasets/redux/constants';
import { constants as moleculeConstants } from '../components/preview/molecule/redux/constants';
import { constants as projectConstants } from '../components/projects/redux/constants';
import { setSnapshotIsDirty } from '../components/snapshot/redux/actions';
import { constants as snapshotConstants } from '../components/snapshot/redux/constants';
import { constants as apiConstants } from './api/constants';
import { constants as rootConstants } from './constants';
import { CONSTANTS as nglConstants } from './ngl/constants';
import { constants as selectionConstants } from './selection/constants';

const FILTERED_ACTIONS = {
  [snapshotConstants.SET_SNAPSHOT_IS_DIRTY]: true,
  [nglConstants.SET_ORIENTATION]: true,
  [nglConstants.SET_ORIENTATION_BY_INTERACTION]: true,
  [projectConstants.SET_IS_LOADING_CURRENT_SNAPSHOT]: true,
  [rootConstants.SET_ENTIRE_STATE]: true,
  [selectionConstants.SET_SCROLL_FIRED_FOR_LHS]: true,
  [nglConstants.ADD_TO_QUALITY_CACHE]: true,
  [apiConstants.SET_ALL_MOL_LISTS]: true,
  [apiConstants.SET_MOLECULE_TAGS]: true,
  [apiConstants.SET_CATEGORY_LIST]: true,
  [apiConstants.SET_TAG_LIST]: true,
  [nglConstants.SET_SNAPSHOT_ORIENTATION_APPLIED]: true,
  [apiConstants.SET_ALL_DATA_LOADED]: true,
  [datasetConstants.SET_ALL_INSPIRATIONS]: true,
  [moleculeConstants.ADD_IMAGE_TO_CACHE]: true,
  [nglConstants.LOAD_OBJECT]: true,
  [nglConstants.DECREMENT_COUNT_OF_PENDING_NGL_OBJECTS]: true,
  [apiConstants.SET_LHS_COMPOUNDS_LIST]: true,
  [apiConstants.SET_LHS_DATA_IS_LOADING]: true
};

const shouldActionBeIgnored = action => {
  return FILTERED_ACTIONS[action.type];
};

const shouldBeTrackedInCurrentState = action => (dispatch, getState) => {
  const state = getState();

  const isSnapshotDirty = state.snapshotReducers.isSnapshotDirty;
  const isLoadingCurrentSnapshot = state.projectReducers.isLoadingCurrentSnapshot;

  const lhsDataIsLoading = state.apiReducers.lhsDataIsLoading;
  const lhsDataIsLoaded = state.apiReducers.lhsDataIsLoaded;
  const rhsDataIsLoading = state.apiReducers.rhsDataIsLoading;
  const rhsDataIsLoaded = state.apiReducers.rhsDataIsLoaded;
  const proteinIsLoading = state.apiReducers.proteinIsLoading;
  const proteinIsLoaded = state.apiReducers.proteinIsLoaded;

  const all_data_loaded = state.apiReducers.all_data_loaded;

  const isLoading = lhsDataIsLoading || rhsDataIsLoading || proteinIsLoading;
  const everythingIsLoaded = lhsDataIsLoaded && rhsDataIsLoaded && proteinIsLoaded;

  return !isLoading && everythingIsLoaded && all_data_loaded && !isSnapshotDirty && !isLoadingCurrentSnapshot;
};

const actionTrackingMiddleware = ({ dispatch, getState }) => next => action => {
  if (action) {
    if (!shouldActionBeIgnored(action) && dispatch(shouldBeTrackedInCurrentState(action))) {
      console.log(`actionTrackingMiddleware - action that caused snapshot to be dirty: ${action.type}`);
      dispatch(setSnapshotIsDirty(true));
    }
    next(action);
  }
};

export default actionTrackingMiddleware;
