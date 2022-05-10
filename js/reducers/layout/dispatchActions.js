import { setCurrentLayout } from './actions';
import {
  baseColumnSize,
  hitListFilterLayout,
  hitNavigatorLayout,
  nglLayout,
  rhsLayout,
  tagDetailsLayout,
  viewerControlsLayout,
  projectHistoryLayout,
  layoutItemNames
} from './constants';

export const updateLayout = (showLHS, showRHS, hideProjects, height, margin) => (dispatch, getState) => {
  const { layoutLocked, panelsExpanded } = getState().layoutReducers;

  const maxRows = Math.max(Math.floor((height - margin) / (margin + 1)), 60);

  const lhsBaseHeight = maxRows / 4;
  const tagDetailsRows = panelsExpanded[layoutItemNames.TAG_DETAILS] ? lhsBaseHeight : 5;
  const hitListFilterRows = panelsExpanded[layoutItemNames.HIT_LIST_FILTER] ? lhsBaseHeight : 5;
  const hitNavigatorRows = maxRows - tagDetailsRows - hitListFilterRows;

  const projectHistoryHeight = panelsExpanded[layoutItemNames.PROJECT_HISTORY] ? 16 : 5;
  const nglHeight = maxRows - 5 - !hideProjects * projectHistoryHeight;

  let layout = [
    {
      ...nglLayout,
      x: showLHS * baseColumnSize,
      w: (!showLHS + !showRHS + 1) * baseColumnSize,
      //h: hideProjects * 16 + 39,
      h: nglHeight,
      static: layoutLocked
    },
    {
      ...viewerControlsLayout,
      x: showLHS * baseColumnSize,
      w: (!showLHS + !showRHS + 1) * baseColumnSize,
      y: nglHeight,
      static: layoutLocked
    }
  ];

  if (showLHS) {
    layout = [
      ...layout,
      { ...tagDetailsLayout, h: tagDetailsRows, static: layoutLocked },
      { ...hitListFilterLayout, h: hitListFilterRows, y: tagDetailsRows, static: layoutLocked },
      { ...hitNavigatorLayout, h: hitNavigatorRows, y: tagDetailsRows + hitListFilterRows, static: layoutLocked }
    ];
  }

  if (showRHS) {
    layout = [...layout, { ...rhsLayout, h: maxRows, static: layoutLocked }];
  }

  if (!hideProjects) {
    layout = [
      ...layout,
      {
        ...projectHistoryLayout,
        x: showLHS * baseColumnSize,
        w: (!showLHS + !showRHS + 1) * baseColumnSize,
        y: nglHeight + 5,
        h: projectHistoryHeight,
        static: layoutLocked
      }
    ];
  }

  dispatch(setCurrentLayout({ name: 'defaultLayout', layout }));
};
