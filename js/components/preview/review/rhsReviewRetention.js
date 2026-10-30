import { createSelector } from 'reselect';
import { VIEWS } from '../../../constants/constants';
import { OBJECT_TYPE } from '../../nglView/constants';
import { getRhsPoseObservation, selectRhsObservationData } from '../molecule/utils/rhsObservations';
import { getPosesForObservations } from '../molecule/utils/poseListData';
import { createObservationProjection } from '../molecule/observationUnifiedView/hooks/observationProjection';

const EMPTY_OBJECTS = {};
const observationTypes = Object.values(OBJECT_TYPE).filter(type => type !== OBJECT_TYPE.SPHERE);
const isVisible = representation =>
  representation && representation.visible !== false && representation.params?.visible !== false;

// These detached records are published after representation readiness, and deleted after native disposal.
// Do not walk native handles, copy renderer graphs, or infer readiness from optimistic checkbox/queue lists.
export const getDisplayedRhsObservationIds = (data, objectsInView = EMPTY_OBJECTS, types = observationTypes) => {
  const displayed = new Set();
  Object.entries(objectsInView).forEach(([name, object]) => {
    if (!object || (object.display_div && object.display_div !== VIEWS.MAJOR_VIEW)) return;
    if (object.moleculeId === undefined || object.moleculeId === null) return;
    const supported = object.OBJECT_TYPE
      ? types.includes(object.OBJECT_TYPE)
      : types.some(type => (object.name || name).includes(`_${type}`));
    if (supported && object.representations?.some(isVisible)) displayed.add(String(object.moleculeId));
  });
  return data.observations.map(observation => String(observation.id)).filter(id => displayed.has(id));
};

export const selectDisplayedRhsObservationIds = createSelector(
  selectRhsObservationData,
  state => state.nglReducers?.objectsInView || EMPTY_OBJECTS,
  getDisplayedRhsObservationIds
);

export const selectActiveRhsObservationIds = createSelector(
  selectRhsObservationData,
  state => state.nglReducers?.objectsInView || EMPTY_OBJECTS,
  (data, objects) => getDisplayedRhsObservationIds(data, objects, [OBJECT_TYPE.LIGAND])
);

export const mergeDisplayedRhsPoses = ({ data, normalPoses, displayedIds, compare, columnOptions }) => {
  const matchingIds = new Set(normalPoses.map(pose => String(getRhsPoseObservation(pose)?.id)));
  const retained = new Set(displayedIds);
  const missing = data.observations.filter(
    observation => retained.has(String(observation.id)) && !matchingIds.has(String(observation.id))
  );
  const candidates = getPosesForObservations(data.poses, missing).sort(compare);
  // Use the same toolbar/column comparator composition, without applying the predicates a second time.
  const leading = createObservationProjection({ ...columnOptions, filters: {} })(candidates);
  const seen = new Set();
  return [...leading, ...normalPoses].filter(pose => {
    const id = getRhsPoseObservation(pose)?.id;
    if (id === undefined || id === null || seen.has(String(id))) return false;
    seen.add(String(id));
    return true;
  });
};
