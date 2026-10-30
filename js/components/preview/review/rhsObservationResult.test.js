import { applyMiddleware, combineReducers, legacy_createStore } from 'redux';
import { thunk } from 'redux-thunk';
import { selectionReducers } from '../../../reducers/selection/selectionReducers';
import {
  setUnifiedFilterItem,
  setCoordinateFilterResults,
  setIsCoordinateFilterApplied
} from '../../../reducers/selection/actions';
import { selectJoinedMoleculeListRHS } from '../molecule/redux/selectors';
import { buildRhsObservationData } from '../molecule/utils/rhsObservations';
import { createPoseListComparator } from '../molecule/utils/poseListData';
import {
  buildObservationViewConfig,
  RHS_OBSERVATION_VIEW_CONFIG
} from '../molecule/observationUnifiedView/viewConfigs';
import { getObservationColumns } from '../molecule/observationUnifiedView/hooks/observationColumns';
import { createObservationProjection } from '../molecule/observationUnifiedView/hooks/observationProjection';
import { getAdjacentPoses } from '../molecule/poseTransfer';
import { QUALITY_STATUSES } from '../molecule/moleculeView/qualityStatus/constants';
import {
  projectRhsObservationResult,
  selectRhsTableState,
  updateRhsTableSetting,
  selectRhsMainStatusFilters,
  toggleRhsMainStatusFilter
} from './rhsObservationResult';

const viewConfig = buildObservationViewConfig(RHS_OBSERVATION_VIEW_CONFIG);
const extraColumns = [
  { result_property: 'score', data_type: 'float', visible: true },
  { result_property: 'series', data_type: 'text', visible: true }
];
const columns = getObservationColumns(viewConfig, extraColumns);
const observations = Array.from({ length: 80 }, (_, index) => ({
  id: index + 1,
  cmpd: index + 1,
  code: `design-${index + 1}`,
  virtual_name: `v${index + 1}a`,
  tags_set: [1]
}));
const data = buildRhsObservationData({ observations, moleculeLists: { 10: observations } });
data.poses = data.poses.map((pose, index) => ({
  ...pose,
  activityData: [
    { property_name: 'score', raw_value: index + 1 },
    { property_name: 'series', text_value: index % 2 ? 'beta' : 'alpha' }
  ]
}));
const compare = createPoseListComparator({ sortOption: 'POSE_NAME', ascending: true }, [], []);
const project = (options = {}) =>
  projectRhsObservationResult({
    data,
    observations,
    selection: {},
    searchSettings: { searchBy: {} },
    searchObservations: () => [],
    compare,
    ...options,
    columnOptions: { columns, viewConfig, ...options.columnOptions }
  });
const ids = result => result.poses.map(pose => pose.main_site_observation);
const peerSettings = () => ({
  mainStatus: { good: false, mediocre: false, bad: false, none: false },
  peerReview: Object.fromEntries(
    ['good', 'mediocre', 'bad', 'none', 'onlyMyReviews'].map(key => [key, { checked: false, option: 0, value: '' }])
  )
});

const gradeRecords = [
  { site_observation: 1, main_status: true, status: 'GOOD' },
  { site_observation: 1, main_status: true, status: 'BAD' },
  { site_observation: 2, main_status: true, status: 'MEDIOCRE' },
  { site_observation: 3, main_status: true, status: 'BAD' },
  { site_observation: 4, main_status: true, status: 'NONE' },
  { site_observation: 6, main_status: false, status: 'GOOD', user: 7 },
  { site_observation: 7, main_status: true, status: 'GOOD', comment: 'Created on load' },
  { site_observation: 7, main_status: true, status: 'BAD' },
  { site_observation: 8, main_status: true, status: 'GOOD', comment: 'Created on load' }
];
const combinations = Array.from({ length: 16 }, (_, mask) => [
  mask,
  ['GOOD', 'MEDIOCRE', 'BAD', 'NONE'].filter((_status, index) => mask & (1 << index))
]);

describe('complete RHS observation projection', () => {
  it.each(combinations)(
    'applies main-status OR combination %s to both full results without using peer reviews or load defaults',
    (_mask, active) => {
      expect.hasAssertions();
      const result = project({ columnOptions: { mainStatusFilters: active, allStatuses: gradeRecords } });
      const gradeFor = id => ({ 1: 'GOOD', 2: 'MEDIOCRE', 3: 'BAD', 7: 'BAD' }[id] || 'NONE');
      const expected = observations
        .filter(observation => !active.length || active.includes(gradeFor(observation.id)))
        .map(observation => observation.id);
      expect(ids(result)).toStrictEqual(expected);
      expect(result.reviewPoses.map(pose => pose.main_site_observation)).toStrictEqual(expected);
      expect(result.observations.map(observation => observation.id)).toStrictEqual(expected);
    }
  );

  it('combines the header restriction with search, structure, numeric and the existing advanced main/peer OR filter', () => {
    expect.hasAssertions();
    const settings = peerSettings();
    settings.mainStatus.good = true;
    settings.peerReview.bad.checked = true;
    const allStatuses = [
      ...gradeRecords,
      { site_observation: 2, main_status: false, status: 'BAD', user: 7 },
      { site_observation: 3, main_status: false, status: 'BAD', user: 8 }
    ];
    const columnOptions = {
      mainStatusFilters: ['MEDIOCRE'],
      allStatuses,
      filters: {
        peerReview: settings,
        molecule: { filteredCompounds: [2, 3], structureType: 'compound' },
        score: { type: 'value', condition: 2, value: '2' }
      }
    };
    expect(ids(project({ search: 'v2', columnOptions }))).toStrictEqual([2]);
    expect(ids(project({ search: 'v1', columnOptions }))).toStrictEqual([]);
    expect(ids(project({ columnOptions: { ...columnOptions, mainStatusFilters: ['BAD'] } }))).toStrictEqual([3]);
    expect(settings.mainStatus.good).toBe(true);
    expect(settings.peerReview.bad.checked).toBe(true);
  });

  it('retains displayed grade non-matches in Review and preserves the navigator bypass and active-only semantics', () => {
    expect.hasAssertions();
    const options = {
      displayedIds: ['2', '3'],
      activeIds: ['3'],
      selection: { proteinList: [2, 3], isGlobalEdit: true, moleculesToEdit: [80] },
      columnOptions: {
        mainStatusFilters: ['GOOD'],
        allStatuses: gradeRecords,
        displayedObservationIds: [2, 3],
        showDisplayedMolecules: false
      }
    };
    const normal = project(options);
    expect(ids(normal)).toStrictEqual([1]);
    expect(normal.reviewPoses.map(pose => pose.main_site_observation)).toStrictEqual([2, 3, 1]);
    const bypass = project({ ...options, columnOptions: { ...options.columnOptions, showDisplayedMolecules: true } });
    expect(ids(bypass)).toStrictEqual([1, 2, 3]);
    expect(bypass.reviewPoses.map(pose => pose.main_site_observation)).toStrictEqual([2, 3, 1]);
    const activeOnly = project({ ...options, columnOptions: { ...options.columnOptions, activeOnly: true } });
    expect(ids(activeOnly)).toStrictEqual([3]);
    expect(activeOnly.reviewPoses).toBe(activeOnly.poses);
  });

  it('toggles latest RHS settings independently, normalizes malformed selections, and preserves other filters', () => {
    expect.hasAssertions();
    const store = legacy_createStore(combineReducers({ selectionReducers }), applyMiddleware(thunk));
    store.dispatch(
      setUnifiedFilterItem('rhs', { filters: { detail: { value: 'keep' } }, sortings: { detail: { enabled: true } } })
    );
    store.dispatch(setUnifiedFilterItem('detail', { value: 'LHS' }));
    store.dispatch(toggleRhsMainStatusFilter('GOOD'));
    store.dispatch(toggleRhsMainStatusFilter('MEDIOCRE'));
    store.dispatch(updateRhsTableSetting('filters', 'series', { value: 'alpha' }));
    expect(selectRhsMainStatusFilters(store.getState())).toStrictEqual(['GOOD', 'MEDIOCRE']);
    store.dispatch(toggleRhsMainStatusFilter('GOOD'));
    expect(selectRhsMainStatusFilters(store.getState())).toStrictEqual(['MEDIOCRE']);
    expect(selectRhsTableState(store.getState()).filters).toStrictEqual({
      detail: { value: 'keep' },
      series: { value: 'alpha' }
    });
    expect(store.getState().selectionReducers.unifiedFilter.detail).toStrictEqual({ value: 'LHS' });
    const before = store.getState();
    store.dispatch(toggleRhsMainStatusFilter('unknown'));
    expect(store.getState()).toBe(before);
    store.dispatch(setUnifiedFilterItem('rhs', { mainStatusFilters: ['BAD', 'BAD', 'unknown'] }));
    expect(selectRhsMainStatusFilters(store.getState())).toStrictEqual(['BAD']);
    store.dispatch(setUnifiedFilterItem('rhs', { mainStatusFilters: 'GOOD' }));
    expect(selectRhsMainStatusFilters(store.getState())).toStrictEqual([]);
    expect(ids(project({ columnOptions: { mainStatusFilters: ['unknown'] } }))).toHaveLength(80);
  });

  it('filters and sorts the full result before pagination and supplies the same full navigation order', () => {
    expect.hasAssertions();
    const result = project({
      columnOptions: {
        filters: {
          series: { value: 'beta', condition: 'any', type: 'contains' },
          score: { type: 'value', condition: 2, value: '20' }
        },
        sortings: { score: { enabled: true, order: false } }
      }
    });
    expect(ids(result)).toStrictEqual(Array.from({ length: 31 }, (_, index) => 80 - index * 2));
    expect(result.poses.slice(0, 30).at(-1).main_site_observation).toBe(22);
    const adjacent = getAdjacentPoses(result.poses, result.poses[29].id);
    expect(adjacent.nextPose.main_site_observation).toBe(20);
    expect(result.observations.map(observation => observation.id).sort((a, b) => b - a)).toStrictEqual(ids(result));
    expect(data.poses[0].main_site_observation).toBe(1);
    expect(project({ columnOptions: { sortings: { score: { enabled: true, order: true } } } }).poses[0]).toBe(
      data.poses[0]
    );
  });

  it('combines search, coordinate/tag candidates, structure and existing displayed-item bypass without adding LHS cards', () => {
    expect.hasAssertions();
    const result = project({
      search: 'v80',
      columnOptions: {
        filters: { molecule: { filteredCompounds: [80], structureType: 'compound' } }
      }
    });
    expect(ids(result)).toStrictEqual([80]);
    const displayed = project({
      observations: [],
      selection: { proteinList: [80, 9999] },
      columnOptions: {
        displayedObservationIds: [80],
        showDisplayedMolecules: true,
        filters: { molecule: { filteredCompounds: [], structureType: 'compound' } }
      }
    });
    expect(ids(displayed)).toStrictEqual([80]);
    expect(
      ids(
        project({
          observations: [],
          selection: { proteinList: [80] },
          columnOptions: {
            displayedObservationIds: [80],
            showDisplayedMolecules: false,
            filters: { molecule: { filteredCompounds: [], structureType: 'compound' } }
          }
        })
      )
    ).toStrictEqual([]);
    const state = {
      apiReducers: {
        all_mol_lists: observations,
        tagList: [{ id: 1, meta_category: 'rhs', site_observations: observations.map(o => o.id) }],
        categoryList: []
      },
      datasetsReducers: { moleculeLists: { 10: observations } },
      selectionReducers: { ...selectionReducers(undefined, {}), rhs_selectedTagList: [{ id: 1 }] }
    };
    state.selectionReducers = selectionReducers(state.selectionReducers, setCoordinateFilterResults([80], 'rhs'));
    state.selectionReducers = selectionReducers(state.selectionReducers, setIsCoordinateFilterApplied(true, 'rhs'));
    expect(ids(project({ observations: selectJoinedMoleculeListRHS(state) }))).toStrictEqual([80]);
    state.selectionReducers = { ...state.selectionReducers, rhs_displayAllMolecules: true };
    expect(ids(project({ observations: selectJoinedMoleculeListRHS(state) }))).toStrictEqual([80]);
    state.selectionReducers = { ...state.selectionReducers, rhs_displayUntaggedMolecules: true };
    expect(ids(project({ observations: selectJoinedMoleculeListRHS(state) }))).toStrictEqual([80]);
    expect(state.selectionReducers.isCoordinateFilterAppliedLHS).toBe(false);
  });

  it('preserves advanced main/peer OR matching, latest per-user review, my-review and load-default semantics', () => {
    expect.hasAssertions();
    const settings = peerSettings();
    settings.mainStatus.good = true;
    settings.peerReview.bad = { checked: true, option: 0, value: '1' };
    settings.peerReview.onlyMyReviews.checked = true;
    const allStatuses = [
      { site_observation: 1, status: QUALITY_STATUSES.GOOD, main_status: true },
      { site_observation: 2, status: QUALITY_STATUSES.BAD, main_status: false, user: 7 },
      { site_observation: 2, status: QUALITY_STATUSES.GOOD, main_status: false, user: 7 },
      { site_observation: 3, status: QUALITY_STATUSES.BAD, main_status: false, user: 8 },
      { site_observation: 4, status: QUALITY_STATUSES.GOOD, main_status: true, comment: 'Created on load' }
    ];
    expect(
      ids(project({ columnOptions: { allStatuses, userId: 7, filters: { peerReview: settings } } }))
    ).toStrictEqual([1, 2]);
    settings.mainStatus.good = false;
    expect(
      ids(project({ columnOptions: { allStatuses, userId: 7, filters: { peerReview: settings } } }))
    ).toStrictEqual([2]);
  });

  it('keeps the established multi-column comparator composition and normal toolbar tie order', () => {
    expect.hasAssertions();
    const initial = [data.poses[2], data.poses[1], data.poses[0]];
    const run = createObservationProjection({
      columns,
      viewConfig,
      sortings: {
        score: { enabled: true, order: false },
        series: { enabled: true, order: true }
      }
    });
    expect(run(initial).map(pose => pose.main_site_observation)).toStrictEqual([3, 2, 1]);
    expect(createObservationProjection({ columns, viewConfig })(initial)).toStrictEqual(initial);
  });

  it('keeps canonical RHS settings isolated and accepts external replacement without copying results', () => {
    expect.hasAssertions();
    const store = legacy_createStore(combineReducers({ selectionReducers }), applyMiddleware(thunk));
    store.dispatch(setUnifiedFilterItem('molecule', { smiles: 'LHS' }));
    store.dispatch(setUnifiedFilterItem('detailRHS', { value: 'old RHS' }));
    const before = store.getState();
    expect(selectRhsTableState(before).filters.detail.value).toBe('old RHS');
    expect(selectRhsTableState(before)).toBe(selectRhsTableState(before));
    store.dispatch(updateRhsTableSetting('filters', 'series', { value: 'beta' }));
    store.dispatch(updateRhsTableSetting('sortings', 'score', { enabled: true, order: false }));
    expect(selectRhsTableState(store.getState()).filters.series.value).toBe('beta');
    expect(store.getState().selectionReducers.unifiedFilter.molecule).toStrictEqual({ smiles: 'LHS' });
    store.dispatch(setUnifiedFilterItem('rhs', { filters: {}, sortings: {} }));
    expect(selectRhsTableState(store.getState())).toStrictEqual({ filters: {}, sortings: {} });
    expect(JSON.stringify(selectRhsTableState(store.getState()))).not.toContain('associatedObs');
  });
});
