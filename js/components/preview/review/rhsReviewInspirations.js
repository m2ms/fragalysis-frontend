import { getComputedInspirationsForPose } from '../molecule/utils/computedInspirations';
import { getRhsPoseObservation, selectRhsObservationData } from '../molecule/utils/rhsObservations';
import { getDisplayedRhsObservationIds } from './rhsReviewRetention';
import { OBJECT_TYPE } from '../../nglView/constants';
import { NGL_OBJECTS } from '../../../reducers/ngl/constants';

export const isReviewLigandVisible = (state, observation) =>
  getDisplayedRhsObservationIds({ observations: [observation] }, state.nglReducers?.objectsInView, [OBJECT_TYPE.LIGAND])
    .length > 0;

export const isReviewGroupComplete = (state, observations) =>
  observations.length > 0 &&
  observations.every(
    observation =>
      isReviewLigandVisible(state, observation) &&
      ![
        state.selectionReducers.toBeDisplayedList,
        ...Object.values(state.datasetsReducers?.toBeDisplayedList || {})
      ].some(
        queue =>
          [...(queue || [])]
            .reverse()
            .find(item => String(item.id) === String(observation.id) && item.type === NGL_OBJECTS.LIGAND)?.display ===
          false
      )
  );

export const resolveRhsReviewGroup = (state, id) => {
  const data = selectRhsObservationData(state);
  const observation = data.observations.find(item => String(item.id) === String(id));
  if (!observation) return [];
  const pose = data.poses.find(item => String(getRhsPoseObservation(item)?.id) === String(id));
  const ids = getComputedInspirationsForPose(
    { data: pose || observation, observations: pose?.associatedObs || [observation] },
    state.selectionReducers.rhs_selectedTagList
  );
  // Match the navigator: unresolved/missing inspiration observations are skipped.
  const all = state.apiReducers.all_mol_lists || [];
  const seen = new Set([String(id)]);
  return [
    observation,
    ...ids.flatMap(inspirationId => {
      const inspiration = all.find(item => String(item.id) === String(inspirationId));
      if (!inspiration || seen.has(String(inspirationId))) return [];
      seen.add(String(inspirationId));
      return [inspiration];
    })
  ];
};
