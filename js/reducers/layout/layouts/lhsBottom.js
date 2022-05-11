import { baseColumnSize, collapsedPanelSize, layoutItemNames } from '../constants';

const createLayout = (showLHS, showRHS, hideProjects, height, margin, layoutLocked, panelsExpanded) => {
  const maxRows = Math.max(Math.floor((height - margin) / (margin + 1)), 60);
  const halfRows = maxRows / 2;

  const tagDetailsRows = panelsExpanded[layoutItemNames.TAG_DETAILS] ? halfRows : collapsedPanelSize;
  const hitListFilterRows = panelsExpanded[layoutItemNames.HIT_LIST_FILTER] ? halfRows : collapsedPanelSize;
  const hitNavigatorRows = showRHS ? halfRows : maxRows;

  const rhsHeight = showLHS ? halfRows : maxRows;

  const projectHistoryHeight = panelsExpanded[layoutItemNames.PROJECT_HISTORY] ? 16 : collapsedPanelSize;

  let layout = [
    {
      i: layoutItemNames.NGL,
      x: 0,
      y: 0,
      w: baseColumnSize * (!showLHS * !showRHS + 1),
      h: showLHS ? maxRows - tagDetailsRows : maxRows,
      minW: baseColumnSize,
      minH: collapsedPanelSize,
      static: layoutLocked
    },
    {
      i: layoutItemNames.VIEWER_CONTROLS,
      x: (!showLHS * !showRHS + 1) * baseColumnSize,
      y: 0,
      w: baseColumnSize,
      h: showLHS
        ? maxRows - hitListFilterRows - !hideProjects * projectHistoryHeight
        : hideProjects
        ? maxRows
        : collapsedPanelSize,
      minW: baseColumnSize,
      minH: collapsedPanelSize,
      static: layoutLocked
    }
  ];

  if (showLHS) {
    layout = [
      ...layout,
      {
        i: layoutItemNames.TAG_DETAILS,
        x: 0,
        y: maxRows - tagDetailsRows,
        w: baseColumnSize,
        h: tagDetailsRows,
        minW: baseColumnSize,
        minH: collapsedPanelSize,
        static: layoutLocked
      },
      {
        i: layoutItemNames.HIT_LIST_FILTER,
        x: baseColumnSize,
        y: maxRows - hitListFilterRows,
        w: baseColumnSize,
        h: hitListFilterRows,
        minW: baseColumnSize,
        minH: collapsedPanelSize,
        static: layoutLocked
      },
      {
        i: layoutItemNames.HIT_NAVIGATOR,
        x: baseColumnSize * 2,
        y: showRHS * halfRows,
        w: baseColumnSize,
        h: hitNavigatorRows,
        minW: baseColumnSize,
        minH: collapsedPanelSize,
        static: layoutLocked
      }
    ];
  }

  if (showRHS) {
    layout = [
      ...layout,
      {
        i: layoutItemNames.RHS,
        x: baseColumnSize * 2,
        y: 0,
        w: baseColumnSize,
        h: rhsHeight,
        minW: baseColumnSize,
        minH: collapsedPanelSize,
        static: layoutLocked
      }
    ];
  }

  if (!hideProjects) {
    layout = [
      ...layout,
      {
        i: layoutItemNames.PROJECT_HISTORY,
        x: (!showLHS * !showRHS + 1) * baseColumnSize,
        y: collapsedPanelSize,
        w: baseColumnSize,
        h: projectHistoryHeight,
        minW: baseColumnSize,
        minH: collapsedPanelSize,
        static: layoutLocked
      }
    ];
  }

  return { name: 'defaultLayout', layout };
};

export default createLayout;
