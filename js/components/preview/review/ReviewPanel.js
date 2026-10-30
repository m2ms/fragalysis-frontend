import React from 'react';
import { IconButton, Paper, Typography } from '../../../ui';
import { Close } from '../../../ui/icons';
import { makeStyles } from '../../../ui/styles';
import RichTooltip from '../../tooltip/RichTooltip';
import { TooltipPathProvider } from '../../tooltip/TooltipPathContext';

const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: '0 0 auto',
    minHeight: theme.spacing(4),
    paddingLeft: theme.spacing(1),
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText
  },
  title: {
    fontSize: 13
  },
  close: {
    padding: theme.spacing(0.5)
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    flex: '1 1 auto',
    minHeight: 0,
    overflow: 'hidden',
    padding: theme.spacing(1)
  }
}));

export const ReviewPanel = ({ title, onClose, children }) => {
  const classes = useStyles();
  return (
    <TooltipPathProvider absolute path="fragalysis.preview.review">
      <Paper
        component="section"
        id="observation-review-panel"
        aria-labelledby="observation-review-title"
        className={classes.root}
      >
        <div className={classes.header}>
          <Typography component="h2" id="observation-review-title" className={classes.title}>
            {title}
          </Typography>
          <RichTooltip path="close">
            <IconButton aria-label="Close review panel" color="inherit" className={classes.close} onClick={onClose}>
              <Close fontSize="small" />
            </IconButton>
          </RichTooltip>
        </div>
        <div className={classes.body}>{children}</div>
      </Paper>
    </TooltipPathProvider>
  );
};
