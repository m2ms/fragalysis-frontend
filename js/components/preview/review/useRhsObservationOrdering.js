import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { createPoseListComparator, DEFAULT_POSE_LIST_SORTING } from '../molecule/utils/poseListData';
import { useReview } from './ReviewContext';

export const useRhsObservationOrdering = () => {
  const review = useReview();
  const enabled = !!review;
  const ordering = review?.orderingBySide?.rhs;
  const setOrdering = review?.setOrdering;
  const tags = useSelector(state => state.apiReducers.tagList);
  const categories = useSelector(state => state.apiReducers.categoryList);
  const value = useMemo(() => ({ ...DEFAULT_POSE_LIST_SORTING, ...ordering }), [ordering]);
  const onChange = useCallback(changes => setOrdering?.('rhs', changes), [setOrdering]);
  const compare = useMemo(() => createPoseListComparator(value, tags, categories), [value, tags, categories]);
  return useMemo(() => (enabled ? { value, onChange, compare } : undefined), [enabled, value, onChange, compare]);
};
