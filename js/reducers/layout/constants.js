const prefix = 'REDUCERS_LAYOUT_';

export const layoutItemNames = {
  TAG_DETAILS: 'tagDetails',
  HIT_LIST_FILTER: 'hitListFilter',
  HIT_NAVIGATOR: 'hitNavigator',
  NGL: 'NGL',
  RHS: 'RHS',
  VIEWER_CONTROLS: 'viewerControls',
  PROJECT_HISTORY: 'projectHistory'
};

// export const defaultLayout = {
//   name: 'defaultLayout',
//   layout: [
//     { i: layoutItemNames.TAG_DETAILS, x: 0, y: 0, w: 1, h: 15, static: true },
//     { i: layoutItemNames.HIT_LIST_FILTER, x: 0, y: 15, w: 1, h: 15, static: true },
//     { i: layoutItemNames.HIT_NAVIGATOR, x: 0, y: 30, w: 1, h: 31, static: true },
//     { i: layoutItemNames.NGL, x: 1, y: 0, w: 2, h: 61, static: true },
//     { i: layoutItemNames.RHS, x: 3, y: 0, w: 1, h: 60, static: true }
//   ]
// };

export const defaultLayout = {
  name: 'defaultLayout',
  layout: [
    { i: layoutItemNames.TAG_DETAILS, x: 0, y: 0, w: 47, h: 15, static: true },
    { i: layoutItemNames.HIT_LIST_FILTER, x: 0, y: 15, w: 47, h: 15, static: true },
    { i: layoutItemNames.HIT_NAVIGATOR, x: 0, y: 30, w: 47, h: 31, static: true },
    { i: layoutItemNames.NGL, x: 47, y: 0, w: 94, h: 58, static: true },
    { i: layoutItemNames.RHS, x: 141, y: 0, w: 46, h: 60, static: true },
    { i: layoutItemNames.VIEWER_CONTROLS, x: 47, y: 58, w: 94, h: 3, static: true }
  ]
};

export const defaultLayoutWithHistory = {
  name: 'defaultLayout',
  layout: [
    { i: layoutItemNames.TAG_DETAILS, x: 0, y: 0, w: 47, h: 15, static: true },
    { i: layoutItemNames.HIT_LIST_FILTER, x: 0, y: 15, w: 47, h: 15, static: true },
    { i: layoutItemNames.HIT_NAVIGATOR, x: 0, y: 30, w: 47, h: 31, static: true },
    { i: layoutItemNames.NGL, x: 47, y: 0, w: 94, h: 42, static: true },
    { i: layoutItemNames.RHS, x: 141, y: 0, w: 46, h: 60, static: true },
    { i: layoutItemNames.VIEWER_CONTROLS, x: 47, y: 42, w: 94, h: 3, static: true },
    { i: layoutItemNames.PROJECT_HISTORY, x: 47, y: 45, w: 94, h: 16, static: true }
  ]
};

export const constants = {
  SET_CURRENT_LAYOUT: prefix + 'SET_CURRENT_LAYOUT',
  UPDATE_CURRENT_LAYOUT: prefix + 'UPDATE_CURRENT_LAYOUT'
};
