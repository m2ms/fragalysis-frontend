import { QUALITY_STATUSES } from '../molecule/moleculeView/qualityStatus/constants';
import { getRhsPoseObservation } from '../molecule/utils/rhsObservations';
import { getReviewMainStatusIndex } from './reviewQualityStatus';

export const REVIEW_GRADE_FILTERS = [
  { status: QUALITY_STATUSES.GOOD, label: 'Green' },
  { status: QUALITY_STATUSES.MEDIOCRE, label: 'Yellow' },
  { status: QUALITY_STATUSES.BAD, label: 'Red' },
  { status: QUALITY_STATUSES.NONE, label: 'Ungraded' }
];

export const normalizeRhsMainStatusFilters = filters =>
  REVIEW_GRADE_FILTERS.map(choice => choice.status).filter(
    status => Array.isArray(filters) && filters.includes(status)
  );

export const createRhsMainStatusPredicate = (filters, allStatuses) => {
  const active = normalizeRhsMainStatusFilters(filters);
  if (!active.length) return () => true;
  const statuses = getReviewMainStatusIndex(allStatuses);
  return pose => active.includes(statuses.get(getRhsPoseObservation(pose)?.id) || QUALITY_STATUSES.NONE);
};
