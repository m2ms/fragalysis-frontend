import React, { memo, useRef, useEffect, useCallback, useState } from 'react';
import { Grid, makeStyles } from '@material-ui/core';
import { Delete } from '@material-ui/icons';
import { Panel } from '../../common/Surfaces/Panel';
import { Button } from '../../common/Inputs/Button';
import TagCategory from './tagCategory';
import { useDispatch } from 'react-redux';
import { clearTagSelection } from './redux/dispatchActions';

export const heightOfBody = '164px';
export const defaultHeaderPadding = 15;

const useStyles = makeStyles(theme => ({
  containerExpanded: {
    height: heightOfBody,
    display: 'flex',
    flexDirection: 'column',
    resize: 'vertical',
    overflow: 'auto',
    width: '100%'
  },
  containerCollapsed: {
    height: 0
  },
  nglViewItem: {
    paddingLeft: theme.spacing(1) / 2
  },
  selectorItem: {
    height: '100%'
  }
}));

const TagSelector = memo(({ handleHeightChange }) => {
  const dispatch = useDispatch();
  const classes = useStyles();
  const ref = useRef(null);
  const elementRef = useRef(null);
  const [headerPadding, setheaderPadding] = useState(0);
  const [elementHeight, setElementHeight] = useState(0);

  const handleClearButton = () => {
    dispatch(clearTagSelection());
  };

  useEffect(() => {
    const element = elementRef.current;
    if (element) {
      element.addEventListener('resize', handleResize);
      const observer = new MutationObserver(checkResize);
      observer.observe(element, { attributes: true, attributeOldValue: true, attributeFilter: ['style'] });
    }

    return () => {
      if (element) {
        element.removeEventListener('resize', handleResize);
      }
    };
  }, [elementRef, handleResize, checkResize, headerPadding]);

  const handleResize = useCallback(
    event => {
      handleHeightChange(ref.current.offsetHeight);
    },
    [handleHeightChange]
  );

  const handleScroll = useCallback(
    (el, h) => {
      if (el) {
        const hasVerticalScrollbar = el.scrollHeight > el.clientHeight;
        if (!hasVerticalScrollbar) {
          if (h !== 0) {
            setheaderPadding(0);
          }
        } else {
          if (h !== defaultHeaderPadding) {
            setheaderPadding(defaultHeaderPadding);
          }
        }
      }
    },
    [setheaderPadding]
  );

  const checkResize = useCallback(
    mutations => {
      const el = mutations[0].target;
      const w = el.clientWidth;
      const h = el.clientHeight;

      if (elementHeight !== h) {
        setElementHeight(h);
        handleScroll(elementRef.current?.childNodes[1], headerPadding);

        const event = new CustomEvent('resize', { detail: { width: w, height: h } });
        el.dispatchEvent(event);
      }
    },
    [elementHeight, headerPadding, handleScroll]
  );

  return (
    <Panel
      ref={ref}
      hasHeader
      hasExpansion
      defaultExpanded
      title="Hit cluster selector"
      headerActions={[
        <Button
          onClick={() => handleClearButton()}
          disabled={false}
          color="inherit"
          variant="text"
          size="small"
          startIcon={<Delete />}
          data-id="clearTagSelectionButton"
        >
          Clear selection
        </Button>
      ]}
      onExpandChange={expand => {
        if (ref.current && handleHeightChange instanceof Function) {
          handleHeightChange(ref.current.offsetHeight);
        }
      }}
    >
      <Grid ref={elementRef} className={classes.containerExpanded}>
        <TagCategory headerPadding={headerPadding} />
      </Grid>
    </Panel>
  );
});

export default TagSelector;
