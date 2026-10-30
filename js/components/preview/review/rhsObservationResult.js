import { createSelector } from 'reselect';
import { setUnifiedFilterItem } from '../../../reducers/selection/actions';
import { createObservationProjection } from '../molecule/observationUnifiedView/hooks/observationProjection';
import { filterMolecules } from '../molecule/moleculeListSortFilterDialog';
import { getPosesForObservations } from '../molecule/utils/poseListData';
import { getRhsPoseObservation, searchRhsObservations } from '../molecule/utils/rhsObservations';
import { mergeDisplayedRhsPoses } from './rhsReviewRetention';
import { createRhsMainStatusPredicate, normalizeRhsMainStatusFilters } from './rhsGradeFilters';

const EMPTY = {};
export const selectRhsTableState = createSelector(
  state => state.selectionReducers.unifiedFilter?.rhs,
  state => state.selectionReducers.unifiedFilter?.detailRHS,
  (saved, legacyDetail) => saved || { filters: legacyDetail ? { detail: legacyDetail } : EMPTY, sortings: EMPTY }
);

// Read the latest settings when a widget completes asynchronous work; never copy a stale model over another column.
export const updateRhsTableSetting = (section, name, value) => (dispatch, getState) => {
  const model = selectRhsTableState(getState());
  dispatch(setUnifiedFilterItem('rhs', { ...model, [section]: { ...model[section], [name]: value } }));
};

export const getRhsFilterSmileQuery = state => selectRhsTableState(state).filters?.molecule?.smiles || '';

export const selectRhsGeneralFilter = state =>
  selectRhsTableState(state).generalFilter ?? state.selectionReducers.filter;

export const setRhsGeneralFilter = generalFilter => (dispatch, getState) => {
  dispatch(setUnifiedFilterItem('rhs', { ...selectRhsTableState(getState()), generalFilter }));
};

export const selectRhsMainStatusFilters = createSelector(selectRhsTableState, model =>
  normalizeRhsMainStatusFilters(model.mainStatusFilters)
);

export const toggleRhsMainStatusFilter = status => (dispatch, getState) => {
  if (!normalizeRhsMainStatusFilters([status]).length) return;
  const state = getState();
  const model = selectRhsTableState(state);
  const active = selectRhsMainStatusFilters(state);
  dispatch(
    setUnifiedFilterItem('rhs', {
      ...model,
      mainStatusFilters: active.includes(status)
        ? active.filter(value => value !== status)
        : normalizeRhsMainStatusFilters([...active, status])
    })
  );
};

export const projectRhsObservationResult = ({
  data,
  observations,
  search,
  searchSettings,
  searchObservations,
  selection,
  compare,
  columnOptions,
  displayedIds = [],
  activeIds = []
}) => {
  // This explicit ligand-only view also excludes protein-only retention and optimistic navigator candidates.
  if (columnOptions.activeOnly) {
    const poses = mergeDisplayedRhsPoses({ data, normalPoses: [], displayedIds: activeIds, compare, columnOptions });
    const ids = new Set(activeIds);
    return { poses, reviewPoses: poses, observations: data.observations.filter(obs => ids.has(String(obs.id))) };
  }
  const matchesGrade = createRhsMainStatusPredicate(columnOptions.mainStatusFilters, columnOptions.allStatuses);
  let matching = searchRhsObservations(search, observations, data.poses, searchSettings, searchObservations);
  const normalObservations = selection.filter?.active ? filterMolecules(matching, selection.filter) : matching;
  const normalPoses = createObservationProjection({ ...columnOptions, showDisplayedMolecules: false })(
    getPosesForObservations(data.poses, normalObservations).sort(compare)
  ).filter(matchesGrade);
  const byId = new Map(data.observations.map(observation => [String(observation.id), observation]));
  const addMissing = values => {
    const seen = new Set(matching.map(observation => String(observation.id)));
    const additions = [];
    (values || []).forEach(value => {
      const id = String(typeof value === 'object' ? value.id : value);
      if (!seen.has(id) && byId.has(id)) {
        seen.add(id);
        additions.push(byId.get(id));
      }
    });
    matching = [...additions, ...matching];
  };
  // Preserve the navigator's existing selection-dependent candidates and displayed-item option.
  ['proteinList', 'complexList', 'fragmentDisplayList', 'surfaceList', 'densityList', 'vectorOnList'].forEach(key =>
    addMissing(selection[key])
  );
  if (selection.filter?.active) matching = filterMolecules(matching, selection.filter);
  addMissing(selection.molForTagEdit);
  if (selection.isGlobalEdit) addMissing(selection.moleculesToEdit);
  const candidates = getPosesForObservations(data.poses, matching).sort(compare);
  const poses = createObservationProjection(columnOptions)(candidates).filter(
    pose =>
      matchesGrade(pose) ||
      (columnOptions.showDisplayedMolecules &&
        (columnOptions.viewConfig?.matchesDisplayedObservations?.(pose, columnOptions.displayedObservationIds || []) ??
          columnOptions.displayedObservationIds?.includes(getRhsPoseObservation(pose)?.id)))
  );
  const ids = new Set(poses.flatMap(pose => pose.associatedObs.map(observation => String(observation.id))));
  const reviewPoses = mergeDisplayedRhsPoses({ data, normalPoses, displayedIds, compare, columnOptions });
  return { poses, reviewPoses, observations: matching.filter(observation => ids.has(String(observation.id))) };
};
