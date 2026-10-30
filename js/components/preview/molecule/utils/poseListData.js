export const DEFAULT_POSE_LIST_SORTING = { sortOption: 'POSE_NAME', ascending: true };

export const getPosesForObservations = (poses, observations) =>
  poses.filter(
    pose =>
      observations.some(observation => observation.cmpd === pose.compound) &&
      pose.associatedObs.some(observation => observations.some(item => item.id === observation.id))
  );

export const createPoseListComparator = ({ sortOption, ascending }, tags, categories) => {
  const tagPrefix = (pose, categoryName) => {
    const category = categories.find(item => item.category === categoryName);
    const main = pose.associatedObs.find(observation => observation.id === pose.main_site_observation);
    return (
      tags.find(tag => tag.category === category?.id && tag.site_observations?.includes(main?.id))?.tag_prefix || ''
    );
  };
  const getValue = pose => {
    switch (sortOption) {
      case 'COMPOUND_CODE':
        return pose.main_site_observation_cmpd_code;
      case 'CANONSITE_NUMBER':
        return tagPrefix(pose, 'CanonSites');
      case 'CONFORMERSITE_NUMBER':
        return tagPrefix(pose, 'ConformerSites');
      default:
        return pose.code;
    }
  };
  return (a, b) => {
    if (sortOption === 'OBSERVATION_COUNT') {
      return (ascending ? 1 : -1) * (a.site_observations.length - b.site_observations.length);
    }
    return ascending
      ? getValue(a)?.localeCompare(getValue(b), undefined, { numeric: true, sensitivity: 'base' })
      : getValue(b)?.localeCompare(getValue(a), undefined, { numeric: true, sensitivity: 'base' });
  };
};
