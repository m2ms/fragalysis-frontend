import { setCurrentLayout, setDefaultLayout } from './actions';
import {
  baseColumnSize,
  hitListFilterLayout,
  hitNavigatorLayout,
  nglLayout,
  rhsLayout,
  tagDetailsLayout,
  viewerControlsLayout,
  projectHistoryLayout,
  layoutItemNames,
  collapsedPanelSize
} from './constants';

export const updateLayoutOnDependencyChange = (showLHS, showRHS, hideProjects, height, margin) => (
  dispatch,
  getState
) => {
  const { layoutLocked, panelsExpanded } = getState().layoutReducers;

  const maxRows = Math.max(Math.floor((height - margin) / (margin + 1)), 60);

  const lhsBaseHeight = maxRows / 4;
  const tagDetailsRows = panelsExpanded[layoutItemNames.TAG_DETAILS] ? lhsBaseHeight : collapsedPanelSize;
  const hitListFilterRows = panelsExpanded[layoutItemNames.HIT_LIST_FILTER] ? lhsBaseHeight : collapsedPanelSize;
  const hitNavigatorRows = maxRows - tagDetailsRows - hitListFilterRows;

  const projectHistoryHeight = panelsExpanded[layoutItemNames.PROJECT_HISTORY] ? 16 : collapsedPanelSize;
  const nglHeight = maxRows - collapsedPanelSize - !hideProjects * projectHistoryHeight;

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
        y: nglHeight + collapsedPanelSize,
        h: projectHistoryHeight,
        static: layoutLocked
      }
    ];
  }

  const defaultLayout = { name: 'defaultLayout', layout };
  dispatch(setDefaultLayout(defaultLayout));
  dispatch(setCurrentLayout(defaultLayout));
};
