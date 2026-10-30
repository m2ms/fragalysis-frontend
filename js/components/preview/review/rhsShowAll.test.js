import { applyMiddleware, combineReducers, legacy_createStore } from 'redux';
import { thunk } from 'redux-thunk';
import { selectionReducers } from '../../../reducers/selection/selectionReducers';
import {
  appendRHSSelectedTag,
  removeRHSSelectedTag,
  setRHSDisplayAllMolecules,
  setRHSDisplayUntaggedMolecules,
  setRHSSelectedTags
} from '../../../reducers/selection/actions';
import { molecule } from '../molecule/redux/reducer';
import { MOL_ATTRIBUTES } from '../molecule/redux/constants';
import { selectJoinedMoleculeListLHS, selectJoinedMoleculeListRHS } from '../molecule/redux/selectors';
import { selectRhsObservationData } from '../molecule/utils/rhsObservations';
import { createPoseListComparator } from '../molecule/utils/poseListData';
import { TAG_DETAILS_REMOVED_CATEGORIES } from '../../../constants/constants';
import {
  projectRhsObservationResult,
  selectRhsGeneralFilter,
  selectRhsTableState,
  setRhsGeneralFilter
} from './rhsObservationResult';
import { hideInactiveRhsObservations, showAllRhsObservations } from './rhsShowAll';

const generalFilter = {
  active: true,
  priorityOrder: [],
  filter: Object.fromEntries(MOL_ATTRIBUTES.map(attr => [attr.key, { minValue: 0, maxValue: 0, order: 1 }]))
};
const observations = [1, 2, 3, 4, 5, 6].map(id => ({
  id,
  cmpd: 77,
  code: `obs-${id}`,
  mw: id,
  tags_set: id === 6 ? [30] : id === 4 ? [] : id === 5 ? [3] : [id === 2 ? 2 : 1]
}));
const tags = [
  { id: 1, meta_category: 'rhs', site_observations: [1, 3] },
  { id: 2, meta_category: ' RHS ', site_observations: [2] },
  { id: 3, meta_category: 'rhs', hidden: true, site_observations: [5] },
  { id: 4, meta_category: 'rhs', additional_info: { downloadName: 'internal' } },
  { id: 5, meta_category: 'rhs', category: 99 },
  { id: 30, meta_category: 'lhs' },
  { id: 31 }
];
const setup = (intersection, legacyCoordinates = false) => {
  const api = {
    all_mol_lists: observations,
    tagList: tags,
    categoryList: [{ id: 99, category: TAG_DETAILS_REMOVED_CATEGORIES[0] }]
  };
  const root = combineReducers({
    selectionReducers,
    previewReducers: combineReducers({ molecule }),
    apiReducers: (state = api) => state,
    datasetsReducers: (state = { moleculeLists: { 10: [1, { id: 2 }], 20: [2, 3, observations[3], 5] } }) => state,
    nglReducers: (state = { objectsInView: { retained: { moleculeId: 1 } }, orientation: [1, 2, 3] }) => state
  });
  const initial = root(undefined, {});
  initial.previewReducers.molecule = {
    ...initial.previewReducers.molecule,
    searchStringLHS: 'keep lhs',
    searchStringRHS: 'missing'
  };
  initial.selectionReducers = {
    ...initial.selectionReducers,
    filter: generalFilter,
    rhs_selectedTagList: [tags[0]],
    rhs_tagFilteringMode: intersection,
    rhs_displayUntaggedMolecules: true,
    lhs_selectedTagList: [tags[5]],
    moleculeAllSelection: [observations[2]],
    fragmentDisplayList: [observations[0]],
    toBeDisplayedList: [{ id: 1, type: 'L', display: true, rendered: true }],
    isCoordinateFilterApplied: true,
    coordinateFilterResults: [6],
    isCoordinateFilterAppliedLHS: legacyCoordinates ? undefined : true,
    coordinateFilterResultsLHS: legacyCoordinates ? undefined : [6],
    isCoordinateFilterAppliedRHS: true,
    coordinateFilterResultsRHS: [2],
    sphereCoordinatesRHS: [1, 2, 3],
    coordinateRadiusRHS: 4,
    unifiedFilter: {
      detail: { value: 'LHS filter' },
      molecule: { smiles: 'N' },
      detailRHS: { value: 'old RHS fallback' },
      rhs: {
        mainStatusFilters: ['BAD', 'NONE'],
        filters: { molecule: { smiles: 'CC', filteredCompounds: [] }, mainStatus: ['good'] },
        sortings: { detail: { enabled: 1, order: false } }
      }
    }
  };
  return legacy_createStore(root, initial, applyMiddleware(thunk));
};

describe('review Show all RHS action', () => {
  it('hides inactive observations in one event by clearing RHS tags and display-all modes while preserving filters and scene', () => {
    expect.hasAssertions();
    const store = setup(true);
    store.dispatch(showAllRhsObservations());
    const before = store.getState();
    const updates = jest.fn();
    store.subscribe(updates);
    store.dispatch(hideInactiveRhsObservations());
    const after = store.getState();
    expect(updates).toHaveBeenCalledTimes(1);
    expect(after.selectionReducers.rhs_selectedTagList).toStrictEqual([]);
    expect(after.selectionReducers.rhs_displayAllMolecules).toBe(false);
    expect(after.selectionReducers.rhs_displayUntaggedMolecules).toBe(false);
    expect(selectRhsTableState(after)).toStrictEqual({ ...selectRhsTableState(before), activeOnly: true });
    Object.keys(before.selectionReducers)
      .filter(
        key =>
          !['rhs_selectedTagList', 'rhs_displayAllMolecules', 'rhs_displayUntaggedMolecules', 'unifiedFilter'].includes(
            key
          )
      )
      .forEach(key => expect(after.selectionReducers[key]).toBe(before.selectionReducers[key]));
    expect(after.selectionReducers.unifiedFilter.detail).toBe(before.selectionReducers.unifiedFilter.detail);
    expect(after.previewReducers).toBe(before.previewReducers);
    expect(after.apiReducers).toBe(before.apiReducers);
    expect(after.datasetsReducers).toBe(before.datasetsReducers);
    expect(after.nglReducers).toBe(before.nglReducers);
    store.dispatch(showAllRhsObservations());
    expect(selectRhsTableState(store.getState()).activeOnly).toBe(false);
    expect(selectJoinedMoleculeListRHS(store.getState())).toHaveLength(5);
  });

  it.each([
    setRHSSelectedTags([tags[0]]),
    appendRHSSelectedTag(tags[0]),
    removeRHSSelectedTag(tags[0]),
    setRHSDisplayAllMolecules(true),
    setRHSDisplayUntaggedMolecules(true)
  ])('leaves the explicit active-only view when RHS tag visibility is changed with $type', action => {
    expect.hasAssertions();
    const store = setup(false);
    store.dispatch(hideInactiveRhsObservations());
    expect(selectRhsTableState(store.getState()).activeOnly).toBe(true);
    store.dispatch(action);
    expect(selectRhsTableState(store.getState()).activeOnly).toBe(false);
    expect(store.getState().selectionReducers.filter).toBe(generalFilter);
  });

  it.each([false, true])(
    'clears all RHS predicates with intersection=%s without touching selections, sort, scene or LHS',
    intersection => {
      expect.hasAssertions();
      const store = setup(intersection);
      const before = store.getState();
      const lhs = selectJoinedMoleculeListLHS(before);
      const updates = jest.fn();
      store.subscribe(updates);
      store.dispatch(showAllRhsObservations());
      const after = store.getState();
      const selection = after.selectionReducers;
      const model = selectRhsTableState(after);
      expect(updates).toHaveBeenCalledTimes(1);
      expect(selection.rhs_selectedTagList.map(tag => tag.id)).toStrictEqual([1, 2]);
      expect(selection.rhs_displayAllMolecules).toBe(true);
      expect(selection.rhs_displayUntaggedMolecules).toBe(false);
      expect(selection.rhs_tagFilteringMode).toBe(intersection);
      expect(selection.isCoordinateFilterAppliedRHS).toBe(false);
      expect(selection.coordinateFilterResultsRHS).toStrictEqual([]);
      expect(selection.sphereCoordinatesRHS).toBeNull();
      expect(selection.coordinateRadiusRHS).toBe('');
      expect(model.filters).toStrictEqual({});
      expect(model.mainStatusFilters).toStrictEqual([]);
      expect(model.sortings).toBe(before.selectionReducers.unifiedFilter.rhs.sortings);
      expect(selectRhsGeneralFilter(after)).toStrictEqual({ ...generalFilter, active: false });
      expect(after.previewReducers.molecule.searchStringRHS).toBe('');
      expect(after.previewReducers.molecule.searchStringLHS).toBe('keep lhs');
      expect(selectJoinedMoleculeListRHS(after).map(obs => obs.id)).toStrictEqual([1, 2, 3, 4, 5]);
      const result = projectRhsObservationResult({
        data: selectRhsObservationData(after),
        observations: selectJoinedMoleculeListRHS(after),
        search: after.previewReducers.molecule.searchStringRHS,
        selection: { filter: selectRhsGeneralFilter(after) },
        compare: createPoseListComparator({ ascending: false, sortOption: 'POSE_NAME' }, [], []),
        columnOptions: { ...model }
      });
      expect(result.reviewPoses.map(pose => pose.main_site_observation)).toStrictEqual([5, 4, 3, 2, 1]);
      Object.keys(before.selectionReducers)
        .filter(
          key =>
            ![
              'rhs_selectedTagList',
              'rhs_displayAllMolecules',
              'rhs_displayUntaggedMolecules',
              'isCoordinateFilterAppliedRHS',
              'coordinateFilterResultsRHS',
              'sphereCoordinatesRHS',
              'coordinateRadiusRHS',
              'unifiedFilter'
            ].includes(key)
        )
        .forEach(key => expect(selection[key]).toBe(before.selectionReducers[key]));
      expect(selection.unifiedFilter.detail).toBe(before.selectionReducers.unifiedFilter.detail);
      expect(selection.unifiedFilter.molecule).toBe(before.selectionReducers.unifiedFilter.molecule);
      expect(selectJoinedMoleculeListLHS(after)).toBe(lhs);
      expect(after.apiReducers).toBe(before.apiReducers);
      expect(after.datasetsReducers).toBe(before.datasetsReducers);
      expect(after.nglReducers).toBe(before.nglReducers);
      store.dispatch(showAllRhsObservations());
      expect(selectRhsTableState(store.getState()).resetVersion).toBe(2);
    }
  );

  it('preserves legacy coordinate fallback for LHS and reads/writes the general override without changing the legacy filter', () => {
    expect.hasAssertions();
    const store = setup(false, true);
    expect(selectRhsGeneralFilter(store.getState())).toBe(generalFilter);
    const lhs = selectJoinedMoleculeListLHS(store.getState());
    store.dispatch(showAllRhsObservations());
    expect(selectJoinedMoleculeListLHS(store.getState())).toBe(lhs);
    expect(store.getState().selectionReducers.isCoordinateFilterApplied).toBe(true);
    expect(store.getState().selectionReducers.coordinateFilterResults).toStrictEqual([6]);
    store.dispatch(setRhsGeneralFilter({ ...generalFilter, active: true }));
    expect(selectRhsGeneralFilter(store.getState()).active).toBe(true);
    expect(store.getState().selectionReducers.filter).toBe(generalFilter);
    expect(selectRhsTableState(store.getState()).filters).toStrictEqual({});
  });
});
