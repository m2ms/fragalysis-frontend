import { constants } from './constants';

export const setCurrentLayout = newLayout => {
  return {
    type: constants.SET_CURRENT_LAYOUT,
    newLayout: newLayout
  };
};

export const updateCurrentLayout = (i, props) => {
  return {
    type: constants.UPDATE_CURRENT_LAYOUT,
    payload: { i: i, props: props }
  };
};
