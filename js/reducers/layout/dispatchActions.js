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

export const updateLayout = (showLHS, showRHS, hideProjects) => (dispatch, getState) => {
  const { layoutLocked } = getState().layoutReducers;

  let layout = [
    {
      ...nglLayout,
      x: showLHS * baseColumnSize,
      w: (!showLHS + !showRHS + 1) * baseColumnSize,
      h: hideProjects * 16 + 42,
      static: layoutLocked
    },
    {
      ...viewerControlsLayout,
      x: showLHS * baseColumnSize,
      w: (!showLHS + !showRHS + 1) * baseColumnSize,
      y: hideProjects * 16 + 42,
      static: layoutLocked
    }
  ];

  if (showLHS) {
    layout = [
      ...layout,
      { ...tagDetailsLayout, static: layoutLocked },
      { ...hitListFilterLayout, static: layoutLocked },
      { ...hitNavigatorLayout, static: layoutLocked }
    ];
  }

  if (showRHS) {
    layout = [...layout, { ...rhsLayout, static: layoutLocked }];
  }

  if (!hideProjects) {
    layout = [
      ...layout,
      {
        ...projectHistoryLayout,
        x: showLHS * baseColumnSize,
        w: (!showLHS + !showRHS + 1) * baseColumnSize,
        static: layoutLocked
      }
    ];
  }

  dispatch(setCurrentLayout({ name: 'defaultLayout', layout }));
};
