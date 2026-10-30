import React from 'react';
import { useSelector } from 'react-redux';
import { ReviewButton } from './ReviewButton';
import { selectRhsMainStatusFilters } from './rhsObservationResult';

export const RhsReviewButton = ({ hasItems }) => {
  const filtered = useSelector(state => selectRhsMainStatusFilters(state).length > 0);
  // The header owns these filters: allow reopening an empty result to clear them.
  return <ReviewButton side="rhs" disabled={!hasItems && !filtered} />;
};
