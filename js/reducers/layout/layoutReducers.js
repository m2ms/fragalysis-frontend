import { constants, defaultLayout } from './constants';

export const INITIAL_STATE = {
  layoutLocked: true,
  currentLayout: defaultLayout
};

export const layoutReducers = (state = INITIAL_STATE, action = {}) => {
  switch (action.type) {
    case constants.SET_CURRENT_LAYOUT: {
      return { ...state, currentLayout: { ...action.newLayout } };
    }
    case constants.UPDATE_CURRENT_LAYOUT: {
      let newLayout = { ...state.currentLayout };
      const indexOfItem = newLayout.layout.findIndex(i => i.i === action.payload.i);
      if (indexOfItem >= 0) {
        const item = { ...newLayout.layout[indexOfItem] };
        newLayout.layout[indexOfItem] = { ...item, ...action.payload.props };
        return { ...state, currentLayout: { ...newLayout } };
      } else {
        return state;
      }
    }
    case constants.LOCK_LAYOUT: {
      const locked = action.payload;
      const { currentLayout } = state;

      const newLayout = {
        ...currentLayout,
        layout: currentLayout.layout.map(item => ({ ...item, static: locked }))
      };

      return { ...state, layoutLocked: locked, currentLayout: newLayout };
    }
    default:
      return state;
  }
};
