import { setCurrentLayout } from './actions';
import {
  baseColumnSize,
  hitListFilterLayout,
  hitNavigatorLayout,
  nglLayout,
  rhsLayout,
  tagDetailsLayout,
  viewerControlsLayout,
  projectHistoryLayout
} from './constants';

export const updateLayout = (showLHS, showRHS, hideProjects, height, margin) => (dispatch, getState) => {
  const { layoutLocked } = getState().layoutReducers;

  const maxRows = Math.max(Math.floor((height - margin) / (margin + 1)), 60);
  console.log(maxRows);

  const nglHeight = maxRows - 5 - !hideProjects * 16;
  const lhsBaseHeight = maxRows / 4;

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
      { ...tagDetailsLayout, h: lhsBaseHeight, static: layoutLocked },
      { ...hitListFilterLayout, h: lhsBaseHeight, y: lhsBaseHeight, static: layoutLocked },
      { ...hitNavigatorLayout, h: lhsBaseHeight * 2, y: lhsBaseHeight * 2, static: layoutLocked }
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
        static: layoutLocked
      }
    ];
  }

  dispatch(setCurrentLayout({ name: 'defaultLayout', layout }));
};
