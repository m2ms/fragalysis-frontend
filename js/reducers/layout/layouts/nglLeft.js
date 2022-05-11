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
      x: 0,
      y: 0,
      w: (!showLHS + !showRHS + 1) * baseColumnSize,
      h: nglHeight,
      minW: baseColumnSize,
      minH: collapsedPanelSize,
      static: layoutLocked
    },
    {
      i: layoutItemNames.VIEWER_CONTROLS,
      x: 0,
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
        x: baseColumnSize + !showRHS * baseColumnSize,
        y: 0,
        w: baseColumnSize,
        h: tagDetailsRows,
        minW: baseColumnSize,
        minH: collapsedPanelSize,
        static: layoutLocked
      },
      {
        i: layoutItemNames.HIT_LIST_FILTER,
        x: baseColumnSize + !showRHS * baseColumnSize,
        y: tagDetailsRows,
        w: baseColumnSize,
        h: hitListFilterRows,
        minW: baseColumnSize,
        minH: collapsedPanelSize,
        static: layoutLocked
      },
      {
        i: layoutItemNames.HIT_NAVIGATOR,
        x: baseColumnSize + !showRHS * baseColumnSize,
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
        x: 130,
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
        x: 0,
        y: nglHeight + collapsedPanelSize,
        w: (!showLHS + !showRHS + 1) * baseColumnSize,
        h: projectHistoryHeight,
        minW: baseColumnSize,
        minH: collapsedPanelSize,
        static: layoutLocked
      }
    ];
  }

  return { name: 'nglLeft', layout };
};

export default createLayout;
