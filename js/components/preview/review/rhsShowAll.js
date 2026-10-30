import { constants } from '../../../reducers/selection/constants';
import { getRHSTags } from '../../../reducers/api/selectors';
import { getCategoriesToBeRemovedFromTagDetails } from '../tags/utils/tagUtils';
import { selectRhsGeneralFilter, selectRhsTableState } from './rhsObservationResult';

// One Redux event resets both the result and its controlled widgets. Keep shared legacy/LHS settings intact.
export const showAllRhsObservations = () => (dispatch, getState) => {
  const state = getState();
  const removed = getCategoriesToBeRemovedFromTagDetails(state.apiReducers.categoryList || []);
  const tags = getRHSTags(state).filter(
    tag =>
      tag.hidden !== true &&
      !tag.additional_info?.downloadName &&
      !removed.some(category => category.id === tag.category)
  );
  const model = selectRhsTableState(state);
  dispatch({
    type: constants.SHOW_ALL_RHS_OBSERVATIONS,
    tags,
    model: {
      ...model,
      activeOnly: false,
      filters: {},
      generalFilter: { ...selectRhsGeneralFilter(state), active: false },
      resetVersion: (model.resetVersion || 0) + 1
    }
  });
};

export const hideInactiveRhsObservations = () => (dispatch, getState) => {
  dispatch({
    type: constants.HIDE_INACTIVE_RHS_OBSERVATIONS,
    model: { ...selectRhsTableState(getState()), activeOnly: true }
  });
};
