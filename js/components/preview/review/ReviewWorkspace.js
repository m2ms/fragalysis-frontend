import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { makeStyles, useTheme } from '../../../ui/styles';
import { Resizer } from '../resizer';
import { ReviewContext } from './ReviewContext';
import { ReviewPanel } from './ReviewPanel';

const DEFAULT_PANEL_HEIGHT = 336;
const MIN_PANEL_HEIGHT = 120;
const MIN_UPPER_HEIGHT = 240;

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 0,
    minWidth: 0,
    overflow: 'hidden'
  },
  upper: {
    flex: '1 1 0',
    minHeight: 0,
    minWidth: 0,
    overflow: 'hidden'
  },
  panel: {
    flex: '0 0 auto',
    minHeight: 0,
    overflow: 'hidden'
  }
});

export const ReviewWorkspace = ({ panels, children }) => {
  const classes = useStyles();
  const theme = useTheme();
  const rootRef = useRef(null);
  const [activeSide, setActiveSide] = useState(null);
  const [orderingBySide, setOrderingBySide] = useState({});
  const [requestedHeight, setRequestedHeight] = useState(DEFAULT_PANEL_HEIGHT);
  const [availableHeight, setAvailableHeight] = useState(0);
  const dividerHeight = 4 + 2 * Number.parseFloat(theme.spacing());

  useEffect(() => {
    const node = rootRef.current;
    let active = true;
    const measure = () => {
      if (!active) return;
      const height = node.getBoundingClientRect().height;
      if (height > 0) {
        setAvailableHeight(previous => (Math.abs(previous - height) >= 1 ? height : previous));
      }
    };
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    measure();
    return () => {
      active = false;
      observer.disconnect();
    };
  }, []);

  const clampHeight = useCallback(
    height => {
      if (!availableHeight) return Math.max(MIN_PANEL_HEIGHT, height);
      const upperMinimum = Math.min(MIN_UPPER_HEIGHT, availableHeight / 2);
      const maximum = Math.max(0, availableHeight - upperMinimum - dividerHeight);
      return Math.max(Math.min(MIN_PANEL_HEIGHT, maximum), Math.min(maximum, height));
    },
    [availableHeight, dividerHeight]
  );

  const toggleReview = useCallback(side => {
    setActiveSide(previous => (previous === side ? null : side));
  }, []);
  const closeReview = useCallback(() => setActiveSide(null), []);
  const setOrdering = useCallback((side, ordering) => {
    setOrderingBySide(previous => {
      if (Object.entries(ordering).every(([key, value]) => previous[side]?.[key] === value)) return previous;
      return { ...previous, [side]: { ...previous[side], ...ordering } };
    });
  }, []);
  const resizeReview = useCallback(
    (_x, y) => {
      const bottom = rootRef.current.getBoundingClientRect().bottom;
      setRequestedHeight(clampHeight(bottom - y - dividerHeight / 2));
    },
    [clampHeight, dividerHeight]
  );
  const context = useMemo(() => ({ activeSide, toggleReview, closeReview, orderingBySide, setOrdering }), [
    activeSide,
    toggleReview,
    closeReview,
    orderingBySide,
    setOrdering
  ]);
  const panel = panels[activeSide];

  return (
    <ReviewContext.Provider value={context}>
      <div className={classes.root} ref={rootRef}>
        <div className={classes.upper}>{children}</div>
        {panel && (
          <>
            <Resizer orientation="horizontal" onResize={resizeReview} />
            <div className={classes.panel} style={{ height: clampHeight(requestedHeight) }}>
              <ReviewPanel title={panel.title} onClose={closeReview}>
                {panel.content}
              </ReviewPanel>
            </div>
          </>
        )}
      </div>
    </ReviewContext.Provider>
  );
};
