import React from 'react';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import { Button } from '../../../ui';
import { makeStyles } from '../../../ui/styles';
import { QualityStatusLight } from '../molecule/moleculeView/qualityStatus/QualityStatusLight';
import RichTooltip from '../../tooltip/RichTooltip';
import { TooltipPathProvider } from '../../tooltip/TooltipPathContext';
import { REVIEW_GRADE_FILTERS } from './rhsGradeFilters';
import { selectRhsMainStatusFilters, toggleRhsMainStatusFilter } from './rhsObservationResult';

const useStyles = makeStyles(theme => ({
  group: { display: 'flex', flexWrap: 'wrap', gap: theme.spacing(1) },
  button: {
    '&[aria-pressed="true"]': {
      backgroundColor: theme.palette.action.selected,
      borderColor: theme.palette.primary.main,
      boxShadow: `inset 0 0 0 1px ${theme.palette.primary.main}`
    }
  }
}));

export const ReviewGradeFilters = ({ disabled = false }) => {
  const classes = useStyles();
  const dispatch = useDispatch();
  const selected = useSelector(selectRhsMainStatusFilters, shallowEqual);
  return (
    <TooltipPathProvider absolute path="fragalysis.preview.review">
      <div className={classes.group} role="group" aria-label="Filter by main status">
        {REVIEW_GRADE_FILTERS.map(choice => (
          <RichTooltip key={choice.status} path="mainStatusFilter" values={{ grade: choice.label.toLowerCase() }}>
            <Button
              variant="outlined"
              className={classes.button}
              aria-label={`Filter ${choice.label.toLowerCase()} main status`}
              aria-pressed={selected.includes(choice.status)}
              disabled={disabled}
              startIcon={<QualityStatusLight status={choice.status} size={15} />}
              onClick={() => dispatch(toggleRhsMainStatusFilter(choice.status))}
            >
              {choice.label}
            </Button>
          </RichTooltip>
        ))}
      </div>
    </TooltipPathProvider>
  );
};
