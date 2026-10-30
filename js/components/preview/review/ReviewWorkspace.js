import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { DEFAULT_REVIEW_HEIGHT, MIN_REVIEW_HEIGHT, SET_REVIEW_SETTINGS } from '../../../constants/reviewSettings';
import { makeStyles, useTheme } from '../../../ui/styles';
import { Resizer } from '../resizer';
import { ReviewContext } from './ReviewContext';
import { ReviewPanel } from './ReviewPanel';

const MIN_UPPER_HEIGHT = 240;
const EMPTY_ORDERING = {};

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
  const dispatch = useDispatch();
  const review = useSelector(state => state.selectionReducers.review);
  const revision = useSelector(state => state.selectionReducers.reviewRevision || 0);
  const activeSide = review?.open ? review.owner : null;
  const orderingBySide = review?.orderingBySide || EMPTY_ORDERING;
  const requestedHeight = review?.height || DEFAULT_REVIEW_HEIGHT;
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
      if (!availableHeight) return Math.max(MIN_REVIEW_HEIGHT, height);
      const upperMinimum = Math.min(MIN_UPPER_HEIGHT, availableHeight / 2);
      const maximum = Math.max(0, availableHeight - upperMinimum - dividerHeight);
      return Math.max(Math.min(MIN_REVIEW_HEIGHT, maximum), Math.min(maximum, height));
    },
    [availableHeight, dividerHeight]
  );

  const toggleReview = useCallback(
    side => dispatch({ type: SET_REVIEW_SETTINGS, settings: { owner: side, open: activeSide !== side } }),
    [dispatch, activeSide]
  );
  const closeReview = useCallback(() => dispatch({ type: SET_REVIEW_SETTINGS, settings: { open: false } }), [dispatch]);
  const setOrdering = useCallback(
    (side, ordering) =>
      dispatch({
        type: SET_REVIEW_SETTINGS,
        settings: { orderingBySide: { ...orderingBySide, [side]: { ...orderingBySide[side], ...ordering } } }
      }),
    [dispatch, orderingBySide]
  );
  const resizeReview = useCallback(
    (_x, y) => {
      const bottom = rootRef.current.getBoundingClientRect().bottom;
      dispatch({ type: SET_REVIEW_SETTINGS, settings: { height: clampHeight(bottom - y - dividerHeight / 2) } });
    },
    [dispatch, clampHeight, dividerHeight]
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
              <ReviewPanel key={revision} title={panel.title} onClose={closeReview}>
                {panel.content}
              </ReviewPanel>
            </div>
          </>
        )}
      </div>
    </ReviewContext.Provider>
  );
};
