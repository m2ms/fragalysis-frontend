import { baseColumnSize, collapsedPanelSize, layoutItemNames } from '../constants';

const createLayout = (showLHS, showRHS, hideProjects, height, margin, layoutLocked, panelsExpanded) => {
  const maxRows = Math.max(Math.floor((height - margin) / (margin + 1)), 60);

  const lhsBaseHeight = maxRows / 4;
  const tagDetailsRows = panelsExpanded[layoutItemNames.TAG_DETAILS] ? lhsBaseHeight : collapsedPanelSize;
  const hitListFilterRows = panelsExpanded[layoutItemNames.HIT_LIST_FILTER] ? lhsBaseHeight : collapsedPanelSize;
  const hitNavigatorRows = maxRows - tagDetailsRows - hitListFilterRows;

  const projectHistoryHeight = panelsExpanded[layoutItemNames.PROJECT_HISTORY] ? 16 : collapsedPanelSize;
  const nglHeight = maxRows - collapsedPanelSize - !hideProjects * projectHistoryHeight;

  let layout = [
    {
      i: layoutItemNames.NGL,
      x: showLHS * baseColumnSize,
      y: 0,
      w: (!showLHS + !showRHS + 1) * baseColumnSize,
      h: nglHeight,
      minW: baseColumnSize,
      minH: collapsedPanelSize,
      static: layoutLocked
    },
    {
      i: layoutItemNames.VIEWER_CONTROLS,
      x: showLHS * baseColumnSize,
      y: nglHeight,
      w: (!showLHS + !showRHS + 1) * baseColumnSize,
      h: collapsedPanelSize,
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
        y: 0,
        w: baseColumnSize,
        h: tagDetailsRows,
        minW: baseColumnSize,
        minH: collapsedPanelSize,
        static: layoutLocked
      },
      {
        i: layoutItemNames.HIT_LIST_FILTER,
        x: 0,
        y: tagDetailsRows,
        w: baseColumnSize,
        h: hitListFilterRows,
        minW: baseColumnSize,
        minH: collapsedPanelSize,
        static: layoutLocked
      },
      {
        i: layoutItemNames.HIT_NAVIGATOR,
        x: 0,
        y: tagDetailsRows + hitListFilterRows,
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
        h: maxRows,
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
        x: showLHS * baseColumnSize,
        y: nglHeight + collapsedPanelSize,
        w: (!showLHS + !showRHS + 1) * baseColumnSize,
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
