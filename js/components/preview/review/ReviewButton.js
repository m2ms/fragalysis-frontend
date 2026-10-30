import React from 'react';
import { Button } from '../../../ui';
import { makeStyles } from '../../../ui/styles';
import RichTooltip from '../../tooltip/RichTooltip';
import { TooltipPathProvider } from '../../tooltip/TooltipPathContext';
import { useReview } from './ReviewContext';

const useStyles = makeStyles(theme => ({
  root: {
    position: 'absolute',
    bottom: theme.spacing(1),
    right: theme.spacing(1),
    zIndex: 2
  },
  button: {
    minWidth: 88,
    '&.Mui-disabled': {
      backgroundColor: theme.palette.action.disabledBackground
    }
  }
}));

export const ReviewButton = ({ side, disabled = false }) => {
  const classes = useStyles();
  const review = useReview();
  if (!review) return null;
  const open = review.activeSide === side;
  return (
    <TooltipPathProvider absolute path="fragalysis.preview.review">
      <RichTooltip path={disabled ? 'unavailable' : open ? 'close' : 'open'}>
        <span className={classes.root}>
          <Button
            variant="contained"
            color="primary"
            className={classes.button}
            disabled={disabled}
            aria-controls={open ? 'observation-review-panel' : undefined}
            aria-expanded={open}
            onClick={() => review.toggleReview(side)}
          >
            Review
          </Button>
        </span>
      </RichTooltip>
    </TooltipPathProvider>
  );
};
