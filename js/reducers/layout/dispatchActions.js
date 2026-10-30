import { setCurrentLayout, setDefaultLayout } from './actions';
import { layouts } from './layouts';

export const updateLayoutOnDependencyChange = (
  showLHS,
  showRHS,
  hideProjects,
  height,
  margin,
  fitAvailableHeight = false
) => (dispatch, getState) => {
  const { layoutLocked, panelsExpanded, selectedLayoutName } = getState().layoutReducers;

  const defaultLayout = layouts[selectedLayoutName].createLayout(
    showLHS,
    showRHS,
    hideProjects,
    height,
    margin,
    layoutLocked,
    panelsExpanded,
    fitAvailableHeight
  );

  dispatch(setDefaultLayout(defaultLayout));
  dispatch(setCurrentLayout(defaultLayout));
};
