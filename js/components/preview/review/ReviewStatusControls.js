import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { CircularProgress, IconButton, Typography } from '../../../ui';
import { makeStyles } from '../../../ui/styles';
import { QualityStatusLight } from '../molecule/moleculeView/qualityStatus/QualityStatusLight';
import { QualityStatusWrapper } from '../molecule/moleculeView/qualityStatus/QualityStatusWrapper';
import { QUALITY_STATUSES } from '../molecule/moleculeView/qualityStatus/constants';
import RichTooltip from '../../tooltip/RichTooltip';
import { TooltipPathProvider } from '../../tooltip/TooltipPathContext';
import { canGradeReview, selectReviewMainStatus, useReviewMainStatus } from './reviewMainStatus';

const shortcuts = [
  { status: QUALITY_STATUSES.GOOD, colour: 'green' },
  { status: QUALITY_STATUSES.MEDIOCRE, colour: 'yellow' },
  { status: QUALITY_STATUSES.BAD, colour: 'red' }
];
const useStyles = makeStyles(theme => ({
  root: { height: 44 },
  row: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4, minHeight: 26 },
  shortcut: {
    padding: 2,
    '&[aria-pressed="true"]': { outline: `1px solid ${theme.palette.primary.main}` },
    '&:disabled': { opacity: 0.45 }
  },
  summary: { width: 22, height: 20, marginLeft: 6 },
  feedback: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: 18 },
  error: {
    fontSize: 11,
    color: theme.palette.error.main,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  }
}));

export const ReviewStatusControls = ({ item }) => {
  const classes = useStyles();
  const id = item.observation.id;
  const status = useSelector(state => selectReviewMainStatus(state, id));
  const { pending = false, error, save } = useReviewMainStatus(id);
  const authenticated = canGradeReview();
  const summaryData = useMemo(() => ({ id: item.id, main_site_observation: id }), [item.id, id]);
  return (
    <TooltipPathProvider absolute path="fragalysis.preview.review">
      <div className={classes.root}>
        <div className={classes.row}>
          {shortcuts.map(shortcut => (
            <RichTooltip
              key={shortcut.status}
              path={!authenticated ? 'gradeLogin' : pending ? 'gradePending' : 'setGrade'}
              values={{ colour: shortcut.colour, label: item.label }}
            >
              <span>
                <IconButton
                  className={classes.shortcut}
                  size="small"
                  aria-label={`Set ${shortcut.colour} main status for ${item.label}`}
                  aria-pressed={status === shortcut.status}
                  disabled={!authenticated || pending}
                  onClick={() => save(shortcut.status)}
                >
                  <QualityStatusLight status={shortcut.status} size={18} />
                </IconButton>
              </span>
            </RichTooltip>
          ))}
          <div className={classes.summary}>
            <TooltipPathProvider absolute path="fragalysis.preview.hitnavigator.peerReview">
              <QualityStatusWrapper
                data={summaryData}
                triggerLabel={`Quality status for ${item.label}`}
                readOnly={!authenticated}
              />
            </TooltipPathProvider>
          </div>
        </div>
        <div className={classes.feedback}>
          {pending && <CircularProgress size={12} aria-label={`Saving main status for ${item.label}`} />}
          {error && (
            <Typography role="alert" title={error} className={classes.error}>
              Status not saved. Try again.
            </Typography>
          )}
        </div>
      </div>
    </TooltipPathProvider>
  );
};
