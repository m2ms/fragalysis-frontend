/**
 * Created by abradley on 08/03/2018.
 */
import { combineReducers } from 'redux';
import apiReducers from './api/apiReducers';
import nglReducers from './ngl/nglReducers';
import { selectionReducers } from './selection/selectionReducers';
import { targetReducers } from '../components/target/redux/reducer';
import { snapshotReducers } from '../components/snapshot/redux/reducer';
import { previewReducers } from '../components/preview/redux';
import { projectReducers } from '../components/projects/redux/reducer';
import { issueReducers } from '../components/userFeedback/redux/reducer';
import { datasetsReducers } from '../components/datasets/redux/reducer';
import { jobTableReducer } from '../components/preview/jobTable/redux/reducer';
import { layoutReducers } from './layout/layoutReducers';
import { constants } from './constants';
import { normalizeRhsPoseNavigationConfig } from '../constants/poseNavigation';
import { constants as apiConstants } from './api/constants';
import { normalizeReviewSelection, normalizeReviewSettings } from '../constants/reviewSettings';

const appReducer = combineReducers({
  apiReducers,
  nglReducers,
  selectionReducers,
  targetReducers,
  snapshotReducers,
  previewReducers,
  projectReducers,
  issueReducers,
  datasetsReducers,
  jobTableReducer,
  layoutReducers
});

const rootReducer = (state, action) => {
  if (action.type === constants.SET_ENTIRE_STATE) {
    const selection = normalizeReviewSelection(action.newState.selectionReducers);
    selection.unifiedFilter.rhs.resetVersion = (state?.selectionReducers?.unifiedFilter?.rhs?.resetVersion || 0) + 1;
    return {
      ...action.newState,
      selectionReducers: {
        ...selection,
        reviewRevision: (state?.selectionReducers?.reviewRevision || 0) + 1,
        rhsPoseNavigationConfig: normalizeRhsPoseNavigationConfig(
          action.newState.selectionReducers?.rhsPoseNavigationConfig
        )
      }
    };
  }

  if (action.type === apiConstants.SET_TARGET_ON && state && state.apiReducers?.target_on !== action.target_on) {
    state = {
      ...state,
      selectionReducers: {
        ...state.selectionReducers,
        review: normalizeReviewSettings(),
        reviewRevision: (state.selectionReducers.reviewRevision || 0) + 1,
        unifiedFilter: {
          ...state.selectionReducers.unifiedFilter,
          rhs: {
            resetVersion: (state.selectionReducers.unifiedFilter?.rhs?.resetVersion || 0) + 1,
            generalFilter: { active: false }
          }
        }
      },
      previewReducers: {
        ...state.previewReducers,
        molecule: { ...state.previewReducers?.molecule, imageCache: {}, searchStringRHS: '' }
      }
    };
  }

  return appReducer(state, action);
};

export { rootReducer };
