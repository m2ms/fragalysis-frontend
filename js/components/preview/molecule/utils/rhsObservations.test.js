import {
  buildRhsObservationData,
  createRhsReviewItems,
  searchRhsObservations,
  selectRhsObservationData
} from './rhsObservations';
import { createPoseListComparator, DEFAULT_POSE_LIST_SORTING, getPosesForObservations } from './poseListData';
import { selectJoinedMoleculeListLHS, selectJoinedMoleculeListRHS } from '../redux/selectors';
import { selectionReducers } from '../../../../reducers/selection/selectionReducers';

const observation = (id, code, tags = []) => ({ id, code, cmpd: id, smiles: 'CC', tags_set: tags });
const first = observation(1, 'v2a', [10]);
const second = observation(2, 'v10a', [20]);
const untagged = observation(3, 'v3a');
const tagOnly = observation(4, 'v4a', [20]);
const lhs = observation(5, 'x5a', [30]);
const tags = [
  { id: 10, meta_category: 'rhs', site_observations: [1], category: 1 },
  { id: 20, meta_category: 'rhs', site_observations: [2, 4], category: 1 },
  { id: 30, site_observations: [5], category: 1 }
];
const pose = {
  id: 'rhs-tag-10',
  code: 'group',
  display_name: 'group',
  compound: 1,
  main_site_observation: 1,
  site_observations: [1, 2],
  associatedObs: [first, second]
};
const source = () => ({
  observations: [first, second, untagged, tagOnly, lhs],
  poses: [pose, { ...pose, id: `${pose.id}-1`, parent_pose_id: pose.id, associatedObs: [first] }],
  moleculeLists: { 11: [first, second], 22: [2, untagged, second] },
  tags
});
const stateFor = data => ({
  apiReducers: {
    all_mol_lists: data.observations,
    rhs_compounds_list: data.poses,
    tagList: tags,
    categoryList: [],
    noTagsReceived: false
  },
  datasetsReducers: { moleculeLists: data.moleculeLists },
  selectionReducers: {
    ...selectionReducers(undefined, {}),
    rhs_selectedTagList: [tags[0], tags[1]],
    lhs_selectedTagList: [tags[2]],
    rhs_tagFilteringMode: false,
    lhs_tagFilteringMode: false
  }
});

describe('rhs observation data across datasets', () => {
  it('includes tag-only and untagged RHS observations, splits poses, and deduplicates cards and memberships', () => {
    expect.hasAssertions();
    const input = source();
    const before = JSON.stringify(input);
    const data = buildRhsObservationData(input);
    const items = createRhsReviewItems(data.poses, data.datasetIdsByObservation);
    expect(items.map(item => item.id).sort()).toStrictEqual(['1', '2', '3', '4']);
    expect(items.find(item => item.id === '1')).toMatchObject({
      label: 'v2a',
      pose: { id: 'rhs-tag-10-1', parent_pose_id: 'rhs-tag-10' }
    });
    expect(items.find(item => item.id === '2').datasetIds).toStrictEqual(['11', '22']);
    expect(items.find(item => item.id === '3').pose.id).toBe('rhs-observation-3');
    expect(data.datasetObservations.map(item => item.id)).toStrictEqual([1, 2, 3]);
    expect(JSON.stringify(input)).toBe(before);
    expect(
      createRhsReviewItems(buildRhsObservationData(input).poses, data.datasetIdsByObservation).map(item => item.id)
    ).toStrictEqual(items.map(item => item.id));
  });

  it('keeps an orphan observation identity and recovers pose associations from downloaded observations', () => {
    expect.hasAssertions();
    const data = buildRhsObservationData({
      observations: [first],
      poses: [
        { id: 'orphan', code: 'v91d', compound: 99, main_site_observation: 99, site_observations: [99] },
        { id: 'existing', code: 'v1', compound: 1, main_site_observation: 1, site_observations: [1] },
        { id: 'no-observation', associatedObs: [], site_observations: [] }
      ]
    });
    const items = createRhsReviewItems(data.poses, data.datasetIdsByObservation);
    expect(items.map(item => item.id)).toStrictEqual(['99', '1']);
    expect(items[0]).toMatchObject({ label: 'v91d', observation: { id: 99, tags_set: [] } });
    expect(items[1].observation).toBe(first);
    const design = { ...first, code: 'uploaded-design-set', virtual_name: 'v91d' };
    const virtualData = buildRhsObservationData({ observations: [design], moleculeLists: { 11: [design] } });
    expect(createRhsReviewItems(virtualData.poses, virtualData.datasetIdsByObservation)[0].label).toBe('v91d');
  });

  it('applies RHS tags to all datasets and preserves LHS tag selection and selector identities', () => {
    expect.hasAssertions();
    const state = stateFor(source());
    const data = selectRhsObservationData(state);
    expect(selectRhsObservationData({ ...state })).toBe(data);
    expect(selectJoinedMoleculeListRHS(state).map(item => item.id)).toStrictEqual([2, 1, 4]);
    expect(selectJoinedMoleculeListLHS(state).map(item => item.id)).toStrictEqual([5]);
    const allState = { ...state, selectionReducers: { ...state.selectionReducers, rhs_displayAllMolecules: true } };
    expect(
      selectJoinedMoleculeListRHS(allState)
        .map(item => item.id)
        .sort()
    ).toStrictEqual([1, 2, 3, 4]);
    expect(selectJoinedMoleculeListLHS(allState)).toStrictEqual(selectJoinedMoleculeListLHS(state));
  });

  it('uses the navigator observation labels, search scopes, and natural sorting for cards', () => {
    expect.hasAssertions();
    const data = buildRhsObservationData(source());
    const baseSearch = () => [];
    const settings = { searchBy: { shortcode: true, aliases: false, compoundId: false } };
    expect(
      searchRhsObservations('v10', data.observations, data.poses, settings, baseSearch).map(item => item.id)
    ).toStrictEqual([2]);
    expect(
      searchRhsObservations(
        'v10',
        data.observations,
        data.poses,
        { searchBy: { shortcode: false, aliases: false, compoundId: false } },
        baseSearch
      )
    ).toStrictEqual([]);
    const sorted = getPosesForObservations(data.poses, data.observations).sort(
      createPoseListComparator(DEFAULT_POSE_LIST_SORTING, tags, [])
    );
    expect(createRhsReviewItems(sorted, data.datasetIdsByObservation).map(item => item.label)).toStrictEqual([
      'v2a',
      'v3a',
      'v4a',
      'v10a'
    ]);
    sorted.sort(createPoseListComparator({ sortOption: 'POSE_NAME', ascending: false }, tags, []));
    expect(createRhsReviewItems(sorted, data.datasetIdsByObservation).map(item => item.label)).toStrictEqual([
      'v10a',
      'v4a',
      'v3a',
      'v2a'
    ]);
    expect(() =>
      sorted.sort(createPoseListComparator({ sortOption: 'CANONSITE_NUMBER', ascending: true }, tags, []))
    ).not.toThrow();
  });
});
