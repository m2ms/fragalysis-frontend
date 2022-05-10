const prefix = 'REDUCERS_LAYOUT_';

export const baseColumnSize = 60;

export const layoutItemNames = {
  TAG_DETAILS: 'tagDetails',
  HIT_LIST_FILTER: 'hitListFilter',
  HIT_NAVIGATOR: 'hitNavigator',
  NGL: 'NGL',
  RHS: 'RHS',
  VIEWER_CONTROLS: 'viewerControls',
  PROJECT_HISTORY: 'projectHistory'
};

export const tagDetailsLayout = { i: layoutItemNames.TAG_DETAILS, x: 0, y: 0, w: baseColumnSize, h: 15 };
export const hitListFilterLayout = { i: layoutItemNames.HIT_LIST_FILTER, x: 0, y: 15, w: baseColumnSize, h: 15 };
export const hitNavigatorLayout = { i: layoutItemNames.HIT_NAVIGATOR, x: 0, y: 30, w: baseColumnSize, h: 30 };
export const nglLayout = { i: layoutItemNames.NGL, x: baseColumnSize, y: 0, w: baseColumnSize * 2, h: 39 };
export const rhsLayout = { i: layoutItemNames.RHS, x: 130, y: 0, w: baseColumnSize, h: 60 };
export const viewerControlsLayout = {
  i: layoutItemNames.VIEWER_CONTROLS,
  x: baseColumnSize,
  y: 39,
  w: baseColumnSize * 2,
  h: 5
};
export const projectHistoryLayout = {
  i: layoutItemNames.PROJECT_HISTORY,
  x: baseColumnSize,
  y: 44,
  w: baseColumnSize * 2,
  h: 16
};

export const defaultLayout = {
  name: 'defaultLayout',
  layout: [
    { ...tagDetailsLayout, static: true },
    { ...hitListFilterLayout, static: true },
    { ...hitNavigatorLayout, static: true },
    { ...nglLayout, static: true },
    { ...viewerControlsLayout, static: true }
  ]
};

export const constants = {
  SET_CURRENT_LAYOUT: prefix + 'SET_CURRENT_LAYOUT',
  SET_DEFAULT_LAYOUT: prefix + 'SET_DEFAULT_LAYOUT',
  RESET_CURRENT_LAYOUT: prefix + 'RESET_CURRENT_LAYOUT',
  UPDATE_CURRENT_LAYOUT: prefix + 'UPDATE_CURRENT_LAYOUT',
  LOCK_LAYOUT: prefix + 'LOCK_LAYOUT',
  SET_PANEL_EXPANDED: prefix + 'SET_PANEL_EXPANDED'
};
