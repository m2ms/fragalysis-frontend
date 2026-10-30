import { QUALITY_STATUSES } from '../molecule/moleculeView/qualityStatus/constants';

export const isReviewMainStatusRecord = record => record?.main_status === true && record.comment !== 'Created on load';

export const getReviewMainStatus = (records = [], observationId) =>
  records.find(record => record.site_observation === observationId && isReviewMainStatusRecord(record))?.status ||
  QUALITY_STATUSES.NONE;

// Status lists are newest-first, as in the existing summary. Build once for the complete filtered result.
export const getReviewMainStatusIndex = (records = []) => {
  const index = new Map();
  records.forEach(record => {
    if (isReviewMainStatusRecord(record) && !index.has(record.site_observation))
      index.set(record.site_observation, record.status || QUALITY_STATUSES.NONE);
  });
  return index;
};
