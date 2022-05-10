import { constants } from './constants';

export const setCurrentLayout = newLayout => {
  return {
    type: constants.SET_CURRENT_LAYOUT,
    payload: newLayout
  };
};

export const setDefaultLayout = newLayout => {
  return {
    type: constants.SET_DEFAULT_LAYOUT,
    payload: newLayout
  };
};

export const resetCurrentLayout = () => {
  return {
    type: constants.RESET_CURRENT_LAYOUT
  };
};

export const updateCurrentLayout = (i, props) => {
  return {
    type: constants.UPDATE_CURRENT_LAYOUT,
    payload: { i: i, props: props }
  };
};

export const lockLayout = lock => {
  return {
    type: constants.LOCK_LAYOUT,
    payload: lock
  };
};

export const setPanelsExpanded = (type, expanded) => {
  return {
    type: constants.SET_PANEL_EXPANDED,
    payload: { type, expanded }
  };
};
