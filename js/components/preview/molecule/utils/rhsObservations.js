import { createSelector } from 'reselect';
import { isTagVisibleOnSide, TAG_META_CATEGORIES } from '../../tags/utils/tagUtils';

const EMPTY_ITEMS = [];
const EMPTY_LISTS = {};
const observationKey = value => String(typeof value === 'object' ? value.id : value);

export const getRhsPoseObservation = pose =>
  pose?.associatedObs?.find(observation => observation.id === pose.main_site_observation) || pose?.associatedObs?.[0];

const createObservationPose = (pose, observation) => ({
  ...pose,
  id: `${pose.id}-${observation.id}`,
  parent_pose_id: pose.parent_pose_id || pose.id,
  display_name: observation.code || observation.name || pose.display_name,
  canon_site: pose.canon_site ?? null,
  compound: observation.cmpd,
  main_site_observation: observation.id,
  site_observations: [observation.id],
  main_site_observation_cmpd_code: observation.cmpd_code || observation.compound_code,
  smiles: observation.smiles || pose.smiles,
  code: observation.code || pose.code || pose.display_name,
  canonSiteConf: observation.canon_site_conf,
  canonSite: pose.canonSite ?? null,
  associatedObs: [{ ...observation }]
});

export const splitRhsPosesByObservation = poses =>
  poses
    .filter(pose => {
      const observation = getRhsPoseObservation(pose);
      return (
        !observation ||
        !poses.some(
          parent =>
            parent.id !== pose.id &&
            parent.site_observations?.includes(observation.id) &&
            (pose.parent_pose_id === parent.id || pose.id === `${parent.id}-${observation.id}`)
        )
      );
    })
    .flatMap(pose =>
      pose.associatedObs?.length > 1
        ? pose.associatedObs.map(observation => createObservationPose(pose, observation))
        : [pose]
    );

export const buildRhsObservationData = ({ observations = [], poses = [], moleculeLists = {}, tags = [] }) => {
  const allById = new Map(observations.map(observation => [observationKey(observation), observation]));
  const rhsById = new Map();
  const datasetIdsByObservation = new Map();
  const include = value => {
    if (value === null || value === undefined) return;
    const key = observationKey(value);
    const observation = allById.get(key) || (typeof value === 'object' ? value : null);
    if (observation?.id !== undefined && observation?.id !== null) {
      rhsById.set(key, Array.isArray(observation.tags_set) ? observation : { ...observation, tags_set: [] });
    }
  };
  Object.entries(moleculeLists).forEach(([datasetId, members]) => {
    (members || []).forEach(member => {
      if (member === null || member === undefined) return;
      include(member);
      const key = observationKey(member);
      const memberships = datasetIdsByObservation.get(key) || [];
      if (!memberships.includes(datasetId)) memberships.push(datasetId);
      datasetIdsByObservation.set(key, memberships);
    });
  });
  tags
    .filter(tag => isTagVisibleOnSide(tag, TAG_META_CATEGORIES.RHS))
    .forEach(tag => {
      (tag.site_observations || []).forEach(include);
    });

  const resolvedPoses = poses.map(pose => {
    let associatedObs = pose.associatedObs?.length
      ? pose.associatedObs
      : (pose.site_observations || []).map(id => allById.get(observationKey(id))).filter(Boolean);
    if (!associatedObs.length && pose.main_site_observation !== null && pose.main_site_observation !== undefined) {
      associatedObs = [
        allById.get(observationKey(pose.main_site_observation)) || {
          id: pose.main_site_observation,
          code: pose.code || pose.display_name,
          cmpd: pose.compound,
          smiles: pose.smiles,
          tags_set: []
        }
      ];
    }
    associatedObs.forEach(include);
    return { ...pose, associatedObs, site_observations: pose.site_observations || associatedObs.map(obs => obs.id) };
  });
  const covered = new Set(resolvedPoses.flatMap(pose => (pose.associatedObs || []).map(observationKey)));
  rhsById.forEach((observation, key) => {
    if (covered.has(key)) return;
    resolvedPoses.push({
      ...createObservationPose({ id: `rhs-observation-${key}`, canon_site: null }, observation),
      id: `rhs-observation-${key}`
    });
  });
  return {
    observations: [...rhsById.values()],
    datasetObservations: [...rhsById.values()].filter(observation =>
      datasetIdsByObservation.has(observationKey(observation))
    ),
    poses: splitRhsPosesByObservation(resolvedPoses),
    datasetIdsByObservation
  };
};

export const selectRhsObservationData = createSelector(
  state => state.apiReducers.all_mol_lists || EMPTY_ITEMS,
  state => state.apiReducers.rhs_compounds_list || EMPTY_ITEMS,
  state => state.datasetsReducers?.moleculeLists || EMPTY_LISTS,
  state => state.apiReducers.tagList || EMPTY_ITEMS,
  (observations, poses, moleculeLists, tags) => buildRhsObservationData({ observations, poses, moleculeLists, tags })
);

export const selectRhsObservations = state => selectRhsObservationData(state).observations;

export const createRhsReviewItems = (poses, datasetIdsByObservation) => {
  const seen = new Set();
  return poses.flatMap(pose => {
    const observation = getRhsPoseObservation(pose);
    if (observation?.id === undefined || observation?.id === null) return [];
    const id = observationKey(observation);
    if (seen.has(id)) return [];
    seen.add(id);
    return [
      {
        id,
        label: observation.virtual_name || pose.code || pose.display_name || observation.code || observation.name || id,
        observation,
        pose,
        datasetIds: datasetIdsByObservation.get(id) || EMPTY_ITEMS
      }
    ];
  });
};

export const searchRhsObservations = (searchTerm, observations, poses, settings, searchObservations) => {
  const term = searchTerm?.toLowerCase().trim();
  if (!term) return observations;
  const matched = new Set(searchObservations(searchTerm, observations, settings).map(observation => observation.id));
  const visible = new Set(observations.map(observation => observation.id));
  const searchBy = settings?.searchBy || {};
  poses.forEach(pose => {
    const associated = pose.associatedObs || [];
    const main = getRhsPoseObservation(pose);
    if (!associated.some(observation => visible.has(observation.id))) return;
    const containsTerm = values => values.filter(Boolean).some(value => value.toLowerCase().includes(term));
    const matches =
      (searchBy.shortcode !== false && containsTerm([pose.code, pose.display_name, main?.code, main?.virtual_name])) ||
      (searchBy.compoundId !== false && containsTerm([pose.main_site_observation_cmpd_code, main?.compound_code])) ||
      (searchBy.aliases !== false && containsTerm((main?.identifiers || []).map(identifier => identifier?.name)));
    if (matches)
      associated.forEach(observation => {
        if (visible.has(observation.id)) matched.add(observation.id);
      });
  });
  return observations.filter(observation => matched.has(observation.id));
};
