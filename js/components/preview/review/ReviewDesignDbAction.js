import React, { useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Typography } from '../../../ui';
import { makeStyles } from '../../../ui/styles';
import RichTooltip from '../../tooltip/RichTooltip';
import { TooltipPathProvider } from '../../tooltip/TooltipPathContext';
import { canGradeReview } from './reviewMainStatus';

const useStyles = makeStyles(theme => ({
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    flex: '0 0 auto',
    marginTop: 'auto',
    paddingTop: theme.spacing(1)
  },
  title: {
    display: 'flex',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: theme.spacing(2),
    color: theme.palette.error.main,
    fontWeight: 'bold'
  },
  comingSoon: { color: theme.palette.text.secondary, fontWeight: 'normal' }
}));

export const ReviewDesignDbAction = () => {
  const classes = useStyles();
  const [open, setOpen] = useState(false);
  const authenticated = canGradeReview();
  const close = () => setOpen(false);

  return (
    <TooltipPathProvider absolute path="fragalysis.preview.review">
      <div className={classes.footer}>
        <RichTooltip path={authenticated ? 'pushToDesignDb' : 'pushToDesignDbLogin'}>
          <span>
            <Button
              type="button"
              variant="outlined"
              disabled={!authenticated}
              onClick={() => {
                if (canGradeReview()) setOpen(true);
              }}
            >
              Push to DesignDB
            </Button>
          </span>
        </RichTooltip>
      </div>
      <Dialog
        open={open && authenticated}
        onClose={close}
        aria-labelledby="review-design-db-title"
        aria-describedby="review-design-db-description"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="review-design-db-title" className={classes.title}>
          <span>WARNING!</span>
          <Typography component="span" className={classes.comingSoon}>
            Coming soon
          </Typography>
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="review-design-db-description">
            Are you sure you want to push the most recent Design status to DesignDB? This step cannot be reverted!
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <RichTooltip path="designDbComingSoon">
            <span>
              <Button type="button" disabled>
                YES
              </Button>
            </span>
          </RichTooltip>
          <RichTooltip path="designDbCancel">
            <Button type="button" onClick={close} autoFocus>
              NO
            </Button>
          </RichTooltip>
        </DialogActions>
      </Dialog>
    </TooltipPathProvider>
  );
};
