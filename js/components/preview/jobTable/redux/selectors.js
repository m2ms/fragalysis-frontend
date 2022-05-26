import { createSelector } from 'reselect';

export const getSelectedJobs = createSelector(
  state => state.jobTableReducers.selectedRows,
  rows => rows.map(row => row.original)
);
