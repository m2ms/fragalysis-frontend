import React from 'react';
import { useSelector } from 'react-redux';
import { CircularProgress, Typography } from '../../../ui';
import { makeStyles } from '../../../ui/styles';
import RichTooltip from '../../tooltip/RichTooltip';
import { TooltipPathProvider } from '../../tooltip/TooltipPathContext';
import { MoleculeReviewImage } from './MoleculeReviewImage';
import { selectActiveRhsObservationIds } from './rhsReviewRetention';
import { useReviewLigand } from './ReviewLigandProvider';
import { isReviewGroupComplete, resolveRhsReviewGroup } from './rhsReviewInspirations';

const useStyles = makeStyles(theme => ({
  root: { position: 'relative', height: '100%', width: '100%' },
  host: { display: 'block', height: '100%', width: '100%' },
  button: {
    width: '100%',
    height: '100%',
    padding: 0,
    boxSizing: 'border-box',
    border: '4px solid transparent',
    background: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    '&[aria-pressed="true"]': { borderColor: theme.palette.primary.main },
    '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
    '&:disabled': { cursor: 'default' }
  },
  pending: { position: 'absolute', top: 6, right: 6, background: theme.palette.background.paper },
  error: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    right: 4,
    background: theme.palette.background.paper,
    color: theme.palette.error.main,
    fontSize: 11,
    pointerEvents: 'none'
  }
}));

export const ReviewLigandImage = ({ item }) => {
  const classes = useStyles();
  const active = useSelector(state => selectActiveRhsObservationIds(state).includes(String(item.id)));
  const complete = useSelector(state => isReviewGroupComplete(state, resolveRhsReviewGroup(state, item.id)));
  const { pending = false, error, ready, toggle } = useReviewLigand(item.id);
  return (
    <TooltipPathProvider absolute path="fragalysis.preview.review">
      <div className={classes.root}>
        <RichTooltip
          path={!ready ? 'viewerUnavailable' : pending ? 'ligandPending' : complete ? 'hideLigand' : 'showLigand'}
          values={{ label: item.label }}
        >
          <span className={classes.host}>
            <button
              type="button"
              className={classes.button}
              aria-pressed={active}
              aria-busy={pending}
              aria-label={`${complete ? 'Hide' : 'Show'} ligand for ${item.label}`}
              disabled={pending || !ready}
              onClick={toggle}
            >
              <MoleculeReviewImage observation={item.observation} label={item.label} />
            </button>
          </span>
        </RichTooltip>
        {pending && (
          <CircularProgress size={18} className={classes.pending} aria-label={`Updating ligand for ${item.label}`} />
        )}
        {error && (
          <Typography component="span" role="alert" title={error} className={classes.error}>
            Unable to update ligand. Click image to retry.
          </Typography>
        )}
      </div>
    </TooltipPathProvider>
  );
};
