import { createSelector } from 'reselect';
import { vectorCompoundsColors } from './constants';

const getVectorCompoundsPerPage = state => state.previewReducers.vectorCompounds.compoundsPerPage;
const getCurrentPage = state => state.previewReducers.vectorCompounds.currentPage;
const getCurrentVectorCompounds = state => state.previewReducers.vectorCompounds.currentCompounds;

export const getVectorCompoundListOffset = createSelector(
  getVectorCompoundsPerPage,
  getCurrentPage,
  (compoundsPerPage, currentPage) => {
    return (currentPage + 1) * compoundsPerPage;
  }
);

export const getCanLoadMoreVectorCompounds = createSelector(
  getVectorCompoundListOffset,
  getCurrentVectorCompounds,
  (compoundsListOffset, compoundsList) => {
    return compoundsListOffset < compoundsList.length;
  }
);
