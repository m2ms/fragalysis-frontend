import { makeStyles } from '@material-ui/core';
import { clamp } from 'lodash';
import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { OutPortal } from 'react-reverse-portal';

import HitNavigator from './molecule/hitNavigator';
import { Resizer } from './resizer';
import { RHS } from './rhs';
import TagDetails from './tags/details/tagDetails';
import SnapshotList from '../snapshot/snapshotList';
import { ViewerControls } from './viewerControls';
import { setResizableLayout, setActualRhsWidth } from '../../reducers/selection/actions';

const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex',
    height: '100%'
  },
  lhs: {
    height: '100%',
    minWidth: 470
  },
  nglColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(),
    height: '100%'
  },
  ngl: {
    flex: 1,
    minHeight: 0
  }
}));

const sideWidth = 492;
const resizerSize = 20; // px   (both vertical & horizontal)
const MIN_SNAPSHOT_H = 100;
const MIN_TAG_DETAILS_H = 100;
const MIN_HIT_NAVIGATOR_H = 120;

export const ResizableLayout = ({ gridRef, hideProjects, showHistory, onShowHistoryChange, nglPortal }) => {
  const classes = useStyles();
  const dispatch = useDispatch();

  const sidesOpen = useSelector(state => state.previewReducers.viewerControls.sidesOpen);
  const tagDetailView = useSelector(state => state.selectionReducers.tagDetailView);
  const preTagList = useSelector(state => state.apiReducers.tagList);
  const tags = useSelector(state => state.apiReducers.tagList);

  const [lhsWidth, setLhsWidth] = useState(sidesOpen.LHS ? sideWidth : 0);
  const [rhsWidth, setRhsWidth] = useState(sidesOpen.RHS ? sideWidth : 0);

  const clampRange = (value, min, max) => Math.max(min, Math.min(max, value));

  const listTagHeight = 19;
  const tagDetailGridLayoutHeight = 135;
  const tagDetailListLayoutHeight = 145;

  /* longest tag length   */
  let maxLengthTagDetail = 0;
  for (let i = 0; i < tags.length; i++) {
    maxLengthTagDetail = Math.max(maxLengthTagDetail, tags[i].tag.length);
  }

  const oneRowHeight = 19;
  const twoRowHeight = 30;
  const threeRowHeight = 48;
  const oneRowTagLength = 15;
  const moreRowTagLength = 30;
  const defaultColumns = 5;

  const absoluteMaxTagLength =
    maxLengthTagDetail > oneRowTagLength
      ? maxLengthTagDetail > moreRowTagLength
        ? threeRowHeight
        : twoRowHeight
      : oneRowHeight;

  const tagDetailListHeight =
    (preTagList.length > 10 ? 10 : preTagList.length) * listTagHeight + tagDetailListLayoutHeight;

  const tagDetailGridHeight =
    Math.ceil((preTagList.length > 10 ? 10 : preTagList.length) / defaultColumns) * absoluteMaxTagLength +
    tagDetailGridLayoutHeight;

  const preferredTagPanelH =
    tagDetailView?.tagDetailView === true || tagDetailView === true ? tagDetailGridHeight : tagDetailListHeight;

  const getColumnInnerHeight = useCallback(() => {
    const gridRect = gridRef.current?.elementRef.current.firstChild.getBoundingClientRect();
    if (!gridRect) return 0;
    return gridRect.height - resizerSize * 2; // two horizontal bars
  }, [gridRef]);

  const [panelHeights, setPanelHeights] = useState(() => {
    const fallbackTotal = 600; // guess until first measurement
    const initialHitNav = Math.max(fallbackTotal - preferredTagPanelH * 2, MIN_HIT_NAVIGATOR_H);
    return {
      snapshot: preferredTagPanelH,
      tagDetails: preferredTagPanelH,
      hitNavigator: initialHitNav
    };
  });

  useLayoutEffect(() => {
    const fitPanelsToColumn = () => {
      const total = getColumnInnerHeight();
      if (!total) return;

      setPanelHeights(prev => {
        const sum = prev.snapshot + prev.tagDetails + prev.hitNavigator;
        const k = total / sum;

        let snap = Math.max(prev.snapshot * k, MIN_SNAPSHOT_H);
        let tag = Math.max(prev.tagDetails * k, MIN_TAG_DETAILS_H);
        let hit = Math.max(prev.hitNavigator * k, MIN_HIT_NAVIGATOR_H);

        let excess = snap + tag + hit - total;
        while (excess > 0.5) {
          if (hit > tag && hit > snap && hit > MIN_HIT_NAVIGATOR_H) {
            const delta = Math.min(excess, hit - MIN_HIT_NAVIGATOR_H);
            hit -= delta;
            excess -= delta;
          } else if (tag > snap && tag > MIN_TAG_DETAILS_H) {
            const delta = Math.min(excess, tag - MIN_TAG_DETAILS_H);
            tag -= delta;
            excess -= delta;
          } else if (snap > MIN_SNAPSHOT_H) {
            const delta = Math.min(excess, snap - MIN_SNAPSHOT_H);
            snap -= delta;
            excess -= delta;
          } else {
            break;
          }
        }

        return { snapshot: snap, tagDetails: tag, hitNavigator: hit };
      });
    };

    fitPanelsToColumn();

    const columnNode = gridRef.current?.elementRef.current.firstChild;
    if (!columnNode) return;

    const ro = new ResizeObserver(fitPanelsToColumn);
    ro.observe(columnNode);
    return () => ro.disconnect();
  }, [getColumnInnerHeight, gridRef]);

  useEffect(() => {
    setLhsWidth(sidesOpen.LHS ? sideWidth : 0);
    setRhsWidth(sidesOpen.RHS ? sideWidth : 0);
  }, [sidesOpen.LHS, sidesOpen.RHS]);

  // Between SnapshotList (top) and TagDetails (middle)
  const onSnapshotResize = useCallback(
    (_, cursorY) => {
      const total = getColumnInnerHeight();
      if (!total) return;

      const gridTop = gridRef.current.elementRef.current.firstChild.getBoundingClientRect().y;

      const newSnapshot = clampRange(
        cursorY - gridTop - resizerSize / 2,
        MIN_SNAPSHOT_H,
        total - MIN_TAG_DETAILS_H - MIN_HIT_NAVIGATOR_H
      );

      setPanelHeights(prev => {
        const belowTotal = total - newSnapshot;
        const ratio = prev.tagDetails / (prev.tagDetails + prev.hitNavigator) || 0.5;

        const newTagDetails = clampRange(belowTotal * ratio, MIN_TAG_DETAILS_H, belowTotal - MIN_HIT_NAVIGATOR_H);
        const newHitNavigator = belowTotal - newTagDetails;

        return {
          snapshot: newSnapshot,
          tagDetails: newTagDetails,
          hitNavigator: newHitNavigator
        };
      });
    },
    [getColumnInnerHeight, gridRef]
  );

  // Between TagDetails (middle) and HitNavigator (bottom)
  const onTagDetailsResize = useCallback(
    (_, cursorY) => {
      dispatch(setResizableLayout(true)); // keep original flag

      const total = getColumnInnerHeight();
      if (!total) return;

      const gridTop = gridRef.current.elementRef.current.firstChild.getBoundingClientRect().y;
      const offset = panelHeights.snapshot + resizerSize;

      const newTagDetails = clampRange(
        cursorY - gridTop - offset - resizerSize / 2,
        MIN_TAG_DETAILS_H,
        total - panelHeights.snapshot - MIN_HIT_NAVIGATOR_H
      );

      setPanelHeights(prev => ({
        ...prev,
        tagDetails: newTagDetails,
        hitNavigator: total - panelHeights.snapshot - newTagDetails
      }));
    },
    [dispatch, getColumnInnerHeight, gridRef, panelHeights.snapshot]
  );

  const onLhsResize = useCallback(
    x => {
      setLhsWidth(() => {
        const gridRect = gridRef.current?.elementRef.current.firstChild.getBoundingClientRect();
        if (!gridRect) return 0;

        const adjustedX = x - gridRect.x - resizerSize / 2;
        const containerWidth = sidesOpen.RHS
          ? gridRect.width - rhsWidth - resizerSize * 2
          : gridRect.width - resizerSize;

        return clamp(adjustedX, 0, containerWidth);
      });
    },
    [gridRef, rhsWidth, sidesOpen.RHS]
  );

  const onRhsResize = useCallback(
    x => {
      setRhsWidth(() => {
        const gridRect = gridRef.current?.elementRef.current.firstChild.getBoundingClientRect();
        if (!gridRect) return 0;

        let adjustedX, containerWidth;
        if (sidesOpen.LHS) {
          adjustedX = x - gridRect.x - (lhsWidth + resizerSize) - resizerSize / 2;
          containerWidth = gridRect.width - lhsWidth - resizerSize * 2;
        } else {
          adjustedX = x - gridRect.x - resizerSize / 2;
          containerWidth = gridRect.width - resizerSize;
        }
        const actual = containerWidth - clamp(adjustedX, 0, containerWidth);
        dispatch(setActualRhsWidth(actual));

        if (actual < 480) return 480;
        if (actual > 900) return 900;
        return actual;
      });
    },
    [gridRef, lhsWidth, sidesOpen.LHS, dispatch]
  );

  return (
    <div className={classes.root}>
      {/* ─────────── LEFT SIDE BAR ─────────── */}
      {sidesOpen.LHS && (
        <>
          <div className={classes.lhs} style={{ width: lhsWidth }}>
            {/* SnapshotList */}
            <div style={{ height: panelHeights.snapshot, overflow: 'auto' }}>
              <SnapshotList />
            </div>
            <Resizer orientation="horizontal" onResize={onSnapshotResize} />

            {/* TagDetails */}
            <div style={{ height: panelHeights.tagDetails, overflow: 'auto' }}>
              <TagDetails />
            </div>
            <Resizer orientation="horizontal" onResize={onTagDetailsResize} />

            {/* HitNavigator */}
            <div style={{ height: panelHeights.hitNavigator }}>
              <HitNavigator />
            </div>
          </div>
          <Resizer onResize={onLhsResize} />
        </>
      )}

      {/* ─────────── NGL COLUMN ─────────── */}
      <div
        className={classes.nglColumn}
        style={{
          width: `calc(100% - ${lhsWidth}px - ${rhsWidth}px - ${sidesOpen.LHS * resizerSize}px - ${sidesOpen.RHS *
            resizerSize}px)`
        }}
      >
        <div className={classes.ngl}>
          <OutPortal node={nglPortal} />
        </div>
        <ViewerControls />
      </div>

      {/* ─────────── RIGHT SIDE BAR ─────────── */}
      {sidesOpen.RHS && (
        <>
          <Resizer onResize={onRhsResize} />
          <div style={{ width: rhsWidth }}>
            <RHS />
          </div>
        </>
      )}
    </div>
  );
};
