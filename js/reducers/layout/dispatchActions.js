import { setCurrentLayout, setDefaultLayout } from './actions';
import { layouts } from './layouts';

export const updateLayoutOnDependencyChange = (showLHS, showRHS, hideProjects, height, margin) => (
  dispatch,
  getState
) => {
  const { layoutLocked, panelsExpanded } = getState().layoutReducers;

  const defaultLayout = layouts.lhsBottom(showLHS, showRHS, hideProjects, height, margin, layoutLocked, panelsExpanded);

  dispatch(setDefaultLayout(defaultLayout));
  dispatch(setCurrentLayout(defaultLayout));
};
