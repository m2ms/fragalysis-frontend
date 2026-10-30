import { applyMiddleware, combineReducers, legacy_createStore } from 'redux';
import { thunk } from 'redux-thunk';
import nglReducers from '../../../reducers/ngl/nglReducers';
import { loadObject, deleteObject } from '../../../reducers/ngl/dispatchActions';
import { ViewerAdapter } from '../../../viewer/ViewerAdapter';
import { VIEWS } from '../../../constants/constants';
import { OBJECT_TYPE } from '../../nglView/constants';
import { buildRhsObservationData } from '../molecule/utils/rhsObservations';
import { createPoseListComparator } from '../molecule/utils/poseListData';
import {
  buildObservationViewConfig,
  RHS_OBSERVATION_VIEW_CONFIG
} from '../molecule/observationUnifiedView/viewConfigs';
import { getObservationColumns } from '../molecule/observationUnifiedView/hooks/observationColumns';
import { projectRhsObservationResult } from './rhsObservationResult';
import {
  getDisplayedRhsObservationIds,
  selectActiveRhsObservationIds,
  selectDisplayedRhsObservationIds
} from './rhsReviewRetention';

const observations = [1, 2, 3, 4].map(id => ({ id, cmpd: 77, code: `v${id}a`, tags_set: [] }));
const data = buildRhsObservationData({ observations, moleculeLists: { 10: [1, { id: 2 }], 20: [2, 3, 4] } });
const viewConfig = buildObservationViewConfig(RHS_OBSERVATION_VIEW_CONFIG);
const columns = getObservationColumns(viewConfig);
const representation = { uuid: 'repr', type: 'ball+stick', params: {}, visible: true };
const object = (id, type = OBJECT_TYPE.LIGAND, changes = {}) => ({
  name: `v${id}a_${type}`,
  moleculeId: id,
  OBJECT_TYPE: type,
  display_div: VIEWS.MAJOR_VIEW,
  representations: [representation],
  ...changes
});
const state = objectsInView => ({
  apiReducers: { all_mol_lists: [...observations, { id: 99, cmpd: 77 }], tagList: [] },
  datasetsReducers: { moleculeLists: { 10: [1, 2], 20: [3, 4] } },
  nglReducers: { objectsInView }
});
const project = (options = {}) =>
  projectRhsObservationResult({
    data,
    observations: [observations[1], observations[3]],
    selection: {},
    searchSettings: { searchBy: {} },
    searchObservations: () => [],
    compare: createPoseListComparator({ ascending: true, sortOption: 'POSE_NAME' }, [], []),
    ...options,
    columnOptions: { columns, viewConfig, ...options.columnOptions }
  });
const ids = result => result.reviewPoses.map(pose => pose.main_site_observation);
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((accept, fail) => {
    resolve = accept;
    reject = fail;
  });
  return { promise, resolve, reject };
};

describe('displayed RHS review retention', () => {
  it('uses acknowledged visible design ligands for Hide all inactive, excluding protein-only and other object types', () => {
    expect.hasAssertions();
    const objects = {
      ligand: object('1'),
      duplicate: object(1),
      otherDataset: object(3),
      legacy: object(2, undefined, { OBJECT_TYPE: undefined, name: 'legacy_LIGAND_20' }),
      lhs: object(99),
      compound: object(77),
      protein: object(4, OBJECT_TYPE.HIT_PROTEIN),
      complex: object(4, OBJECT_TYPE.COMPLEX),
      surface: object(4, OBJECT_TYPE.SURFACE),
      map: object(4, OBJECT_TYPE.DENSITY),
      hidden: object(4, OBJECT_TYPE.LIGAND, { representations: [{ ...representation, visible: false }] }),
      summary: object(4, OBJECT_TYPE.LIGAND, { display_div: VIEWS.SUMMARY_VIEW })
    };
    expect(selectActiveRhsObservationIds(state(objects))).toStrictEqual(['1', '2', '3']);
    const result = project({
      observations,
      search: 'nothing matches',
      selection: { proteinList: [4], fragmentDisplayList: [4] },
      displayedIds: ['1', '2', '3', '4'],
      activeIds: ['1', '3'],
      columnOptions: {
        activeOnly: true,
        showDisplayedMolecules: false,
        filters: { molecule: { filteredCompounds: [], structureType: 'compound' } },
        sortings: { detail: { enabled: 1, order: false } }
      }
    });
    expect(ids(result)).toStrictEqual([3, 1]);
    expect(result.poses).toBe(result.reviewPoses);
    expect(result.observations.map(obs => obs.id)).toStrictEqual([1, 3]);
    expect(ids(project({ observations, columnOptions: { activeOnly: true } }))).toStrictEqual([]);
  });

  it.each([
    OBJECT_TYPE.LIGAND,
    OBJECT_TYPE.HIT_PROTEIN,
    OBJECT_TYPE.COMPLEX,
    OBJECT_TYPE.SURFACE,
    OBJECT_TYPE.DENSITY,
    OBJECT_TYPE.QUALITY,
    OBJECT_TYPE.ARROW,
    OBJECT_TYPE.CYLINDER,
    OBJECT_TYPE.LINE,
    OBJECT_TYPE.ARTEFACTS,
    OBJECT_TYPE.EVENTMAP,
    OBJECT_TYPE.HOTSPOT
  ])('recognizes acknowledged visible %s metadata on either dataset path', type => {
    expect.hasAssertions();
    expect(getDisplayedRhsObservationIds(data, { one: object('1', type), two: object(3, type) })).toStrictEqual([
      '1',
      '3'
    ]);
  });

  it('uses observation identity, visibility and main-view acknowledgements without inspecting native graphs', () => {
    expect.hasAssertions();
    const native = { buffer: new Uint8Array(64) };
    native.self = native;
    const acknowledged = object(1);
    Object.defineProperty(acknowledged, 'nativeRepresentation', {
      get: () => {
        throw Error('native traversal');
      }
    });
    expect(
      getDisplayedRhsObservationIds(data, {
        acknowledged,
        duplicate: object(1, OBJECT_TYPE.DENSITY),
        otherDataset: object(1, OBJECT_TYPE.SURFACE),
        legacy: object(2, undefined, { OBJECT_TYPE: undefined, name: 'legacy_PROTEIN_20' }),
        hidden: object(3, OBJECT_TYPE.LIGAND, { representations: [{ ...representation, params: { visible: false } }] }),
        hiddenNative: object(3, OBJECT_TYPE.SURFACE, { representations: [{ ...representation, visible: false }] }),
        empty: object(3, OBJECT_TYPE.DENSITY, { representations: [] }),
        summary: object(4, OBJECT_TYPE.LIGAND, { display_div: VIEWS.SUMMARY_VIEW }),
        lhs: object(99),
        compoundId: object(77),
        sphere: object(4, OBJECT_TYPE.SPHERE),
        circular: object(2, OBJECT_TYPE.COMPLEX, { native })
      })
    ).toStrictEqual(['1', '2']);
    expect(selectDisplayedRhsObservationIds(state({ lhs: object(99) }))).toStrictEqual([]);
  });

  it('pins only displayed non-matches, deduplicates observations and restores matching natural positions', () => {
    expect.hasAssertions();
    expect(ids(project({ displayedIds: ['1', '3', '4'] }))).toStrictEqual([1, 3, 2, 4]);
    expect(ids(project({ displayedIds: ['1', '3', '4'], observations }))).toStrictEqual([1, 2, 3, 4]);
    const reversed = createPoseListComparator({ ascending: false, sortOption: 'POSE_NAME' }, [], []);
    expect(ids(project({ displayedIds: ['1', '3', '4'], compare: reversed }))).toStrictEqual([3, 1, 4, 2]);
    expect(
      ids(
        project({
          displayedIds: ['1', '3', '4'],
          columnOptions: {
            sortings: { detail: { enabled: 1, order: false } }
          }
        })
      )
    ).toStrictEqual([3, 1, 4, 2]);
    expect(
      ids(project({ data: { ...data, poses: [...data.poses, data.poses[0]] }, displayedIds: ['1'] }))
    ).toStrictEqual([1, 2, 4]);
  });

  it('retains across simultaneous predicates with the navigator bypass disabled and never changes navigator eligibility', () => {
    expect.hasAssertions();
    const result = project({
      observations: [observations[1]],
      search: 'no match',
      displayedIds: ['1'],
      columnOptions: {
        showDisplayedMolecules: false,
        filters: {
          detail: { value: 'also no match', observationCode: true },
          molecule: { filteredCompounds: [], structureType: 'compound' }
        }
      }
    });
    expect(result.poses).toStrictEqual([]);
    expect(ids(result)).toStrictEqual([1]);
    expect(
      ids(
        project({ observations: [], selection: { proteinList: [1], toBeDisplayedList: [{ id: 1, rendered: true }] } })
      )
    ).toStrictEqual([]);
    expect(
      ids(project({ observations: [], displayedIds: ['1'], columnOptions: { showDisplayedMolecules: true } }))
    ).toStrictEqual([1]);
  });

  it('waits for real load/disposal acknowledgements even when queue and checkbox signals disagree', async () => {
    expect.hasAssertions();
    const rendering = deferred();
    const deletion = deferred();
    const resources = new Set();
    class Runtime extends ViewerAdapter {
      loadObject() {
        return rendering.promise;
      }
      async removeObjects() {
        await deletion.promise;
        resources.clear();
      }
    }
    const runtime = new Runtime();
    const reducer = combineReducers({
      nglReducers,
      apiReducers: (s = state({}).apiReducers) => s,
      datasetsReducers: (s = state({}).datasetsReducers) => s
    });
    const store = legacy_createStore(reducer, applyMiddleware(thunk));
    const target = object(1);
    delete target.representations;
    const load = store.dispatch(loadObject({ target, stage: runtime }));
    expect(selectDisplayedRhsObservationIds(store.getState())).toStrictEqual([]);
    expect(selectActiveRhsObservationIds(store.getState())).toStrictEqual([]);
    const native = { buffers: new Uint8Array(128) };
    native.self = native;
    resources.add(native);
    rendering.resolve([
      { ...representation, nativeRepresentation: native, parentObject: native, ready: Promise.resolve(native) }
    ]);
    await load;
    expect(selectDisplayedRhsObservationIds(store.getState())).toStrictEqual(['1']);
    expect(selectActiveRhsObservationIds(store.getState())).toStrictEqual(['1']);
    expect(store.getState().nglReducers.objectsInView[target.name].representations[0]).not.toHaveProperty(
      'nativeRepresentation'
    );
    const removing = store.dispatch(deleteObject(target, runtime));
    expect(resources.size).toBe(1);
    expect(selectDisplayedRhsObservationIds(store.getState())).toStrictEqual(['1']);
    expect(selectActiveRhsObservationIds(store.getState())).toStrictEqual(['1']);
    deletion.resolve();
    await removing;
    expect(resources.size).toBe(0);
    expect(selectDisplayedRhsObservationIds(store.getState())).toStrictEqual([]);
    expect(selectActiveRhsObservationIds(store.getState())).toStrictEqual([]);
    const failedRuntime = new Runtime();
    failedRuntime.loadObject = () => Promise.reject(new Error('load failed'));
    await expect(store.dispatch(loadObject({ target, stage: failedRuntime }))).rejects.toThrow('load failed');
    expect(selectDisplayedRhsObservationIds(store.getState())).toStrictEqual([]);
  });
});
