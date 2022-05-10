import { constants, defaultLayout, layoutItemNames } from './constants';

export const INITIAL_STATE = {
  layoutLocked: true,
  currentLayout: defaultLayout,
  panelsExpanded: {
    [layoutItemNames.TAG_DETAILS]: true,
    [layoutItemNames.HIT_LIST_FILTER]: true,
    [layoutItemNames.PROJECT_HISTORY]: true
  }
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
    case constants.SET_PANEL_EXPANDED: {
      const { type, expanded } = action.payload;
      const { panelsExpanded } = state;

      return { ...state, panelsExpanded: { ...panelsExpanded, [type]: expanded } };
    }
    default:
      return state;
  }
};
