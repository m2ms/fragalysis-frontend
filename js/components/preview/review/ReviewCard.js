import React from 'react';
import { Typography } from '../../../ui';
import { makeStyles } from '../../../ui/styles';

export const REVIEW_CARD_WIDTH = 200;
export const REVIEW_CARD_HEIGHT = 244;

const useStyles = makeStyles(theme => ({
  root: {
    width: '100%',
    height: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box',
    padding: theme.spacing(1),
    border: `1px solid ${theme.palette.background.divider}`,
    backgroundColor: theme.palette.background.paper
  },
  image: {
    height: 144,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  footer: {
    position: 'relative',
    marginTop: theme.spacing(0.5),
    minHeight: 24
  },
  actions: {
    position: 'absolute',
    top: 0,
    left: 0
  },
  label: {
    textAlign: 'center',
    fontWeight: 'bold',
    overflowWrap: 'anywhere',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden'
  }
}));

export const ReviewCard = ({ label, image, actions, details, position, total }) => {
  const classes = useStyles();
  return (
    <article role="listitem" aria-label={label} aria-posinset={position} aria-setsize={total} className={classes.root}>
      <div className={classes.image}>{image}</div>
      <div className={classes.footer}>
        {actions && <div className={classes.actions}>{actions}</div>}
        <Typography className={classes.label} title={label} style={actions ? { paddingInline: 24 } : undefined}>
          {label}
        </Typography>
      </div>
      {details}
    </article>
  );
};
