import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { makeStyles, useTheme } from '../../../ui/styles';
import { ReviewCard, REVIEW_CARD_HEIGHT, REVIEW_CARD_WIDTH } from './ReviewCard';

const OVERSCAN_ROWS = 1;
const useStyles = makeStyles({
  viewport: {
    flex: '1 1 auto',
    minHeight: 0,
    overflow: 'auto',
    overflowAnchor: 'none'
  },
  list: {
    position: 'relative'
  },
  grid: {
    position: 'absolute',
    left: 0,
    right: 0,
    display: 'grid'
  }
});

export const ReviewGrid = ({ items, renderImage, renderActions, renderDetails }) => {
  const classes = useStyles();
  const theme = useTheme();
  const viewportRef = useRef(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0, top: 0 });
  const gap = Number.parseFloat(theme.spacing(2));
  const stride = REVIEW_CARD_HEIGHT + gap;
  const columns = Math.max(1, Math.floor((viewport.width + gap) / (REVIEW_CARD_WIDTH + gap)));
  const rows = Math.ceil(items.length / columns);
  const totalHeight = Math.max(0, rows * stride - gap);
  const top = Math.min(viewport.top, Math.max(0, totalHeight - viewport.height));
  const firstRow = Math.max(0, Math.floor(top / stride) - OVERSCAN_ROWS);
  const endRow = Math.min(rows, Math.ceil((top + viewport.height) / stride) + OVERSCAN_ROWS);
  const start = firstRow * columns;
  const end = viewport.width && viewport.height ? endRow * columns : 0;
  const orderKey = useMemo(() => JSON.stringify(items.map(item => item.id)), [items]);

  const measure = useCallback(() => {
    const node = viewportRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const next = {
      width: node.clientWidth || rect.width,
      height: node.clientHeight || rect.height,
      top: node.scrollTop
    };
    setViewport(previous =>
      previous.width === next.width && previous.height === next.height && previous.top === next.top ? previous : next
    );
  }, []);

  useLayoutEffect(() => {
    const observer = new ResizeObserver(measure);
    observer.observe(viewportRef.current);
    measure();
    return () => observer.disconnect();
  }, [measure]);

  // Filtering/reordering starts at the beginning, including when the old scroll offset exceeds the new result.
  useLayoutEffect(() => {
    viewportRef.current.scrollTop = 0;
    measure();
  }, [orderKey, measure]);

  return (
    <div
      ref={viewportRef}
      className={classes.viewport}
      role="region"
      aria-label="Review thumbnails"
      tabIndex={0}
      onScroll={measure}
    >
      <div role="list" aria-label="Review observations" className={classes.list} style={{ height: totalHeight }}>
        <div
          role="presentation"
          className={classes.grid}
          style={{
            top: firstRow * stride,
            gridTemplateColumns: `repeat(${columns}, minmax(0, ${REVIEW_CARD_WIDTH}px))`,
            gridAutoRows: REVIEW_CARD_HEIGHT,
            gap
          }}
        >
          {items.slice(start, end).map((item, index) => (
            <ReviewCard
              key={item.id}
              label={item.label}
              image={renderImage(item)}
              actions={renderActions?.(item)}
              details={renderDetails?.(item)}
              position={start + index + 1}
              total={items.length}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
