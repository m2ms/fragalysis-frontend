import { setCurrentLayout } from './actions';

export const lockLayout = lock => (dispatch, getState) => {
  const state = getState();

  const currentLayout = state.layoutReducers.currentLayout.layout;
  const newLayout = [];
  currentLayout.forEach(li => {
    const newLi = { ...li, static: lock };
    newLayout.push(newLi);
  });

  dispatch(setCurrentLayout({ ...state.layoutReducers.currentLayout, layout: [...newLayout] }));
};
