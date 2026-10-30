import React, { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button, CircularProgress, Typography } from '../../../ui';
import { makeStyles } from '../../../ui/styles';
import RichTooltip from '../../tooltip/RichTooltip';
import { TooltipPathProvider } from '../../tooltip/TooltipPathContext';
import { hideInactiveRhsObservations, showAllRhsObservations } from './rhsShowAll';
import { createRhsReviewItems } from '../molecule/utils/rhsObservations';
import { useRhsObservationResult } from './useRhsObservationResult';
import { ReviewGrid } from './ReviewGrid';
import { ReviewLigandImage } from './ReviewLigandImage';
import { ReviewCenterButton } from './ReviewCenterButton';
import { ReviewStatusControls } from './ReviewStatusControls';

const renderImage = item => <ReviewLigandImage item={item} />;
const renderActions = item => <ReviewCenterButton item={item} />;
const renderDetails = item => <ReviewStatusControls item={item} />;

const useStyles = makeStyles(theme => ({
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(1),
    marginBottom: theme.spacing(1),
    flexShrink: 0
  }
}));

export const RhsReviewPanel = () => {
  const classes = useStyles();
  const dispatch = useDispatch();
  const loaded = useSelector(state => state.apiReducers.rhsDataIsLoaded);
  const { data, reviewPoses } = useRhsObservationResult();
  const items = useMemo(() => createRhsReviewItems(reviewPoses, data.datasetIdsByObservation), [data, reviewPoses]);
  return (
    <>
      <TooltipPathProvider absolute path="fragalysis.preview.review">
        <div className={classes.actions}>
          <RichTooltip path="showAll">
            <Button variant="outlined" disabled={!loaded} onClick={() => dispatch(showAllRhsObservations())}>
              Show all
            </Button>
          </RichTooltip>
          <RichTooltip path="hideInactive">
            <Button variant="outlined" disabled={!loaded} onClick={() => dispatch(hideInactiveRhsObservations())}>
              Hide all inactive
            </Button>
          </RichTooltip>
        </div>
      </TooltipPathProvider>
      {!loaded ? (
        <CircularProgress size={24} aria-label="Loading designs" />
      ) : !items.length ? (
        <Typography>No designs to review.</Typography>
      ) : (
        <ReviewGrid
          items={items}
          renderImage={renderImage}
          renderActions={renderActions}
          renderDetails={renderDetails}
        />
      )}
    </>
  );
};
