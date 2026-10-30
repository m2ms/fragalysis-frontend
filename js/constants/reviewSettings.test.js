import { rootReducer } from '../reducers/rootReducer';
import { selectionReducers } from '../reducers/selection/selectionReducers';
import { setEntireState } from '../reducers/actions';
import { setTargetOn } from '../reducers/api/actions';
import { reloadSelectionReducer, setUnifiedFilterItem } from '../reducers/selection/actions';
import { DEFAULT_REVIEW_HEIGHT, SET_REVIEW_SETTINGS, normalizeReviewSettings } from './reviewSettings';
import {
  createSnapshotStateForSaving,
  mergeSnapshotStateWithCurrentData
} from '../components/snapshot/redux/utilitySnapshotShapes';

jest.mock('../utils/djangoContext', () => ({ DJANGO_CONTEXT: {} }));

const configure = state =>
  rootReducer(state, {
    type: SET_REVIEW_SETTINGS,
    settings: {
      owner: 'rhs',
      open: true,
      height: 452,
      orderingBySide: { rhs: { sortOption: 'COMPOUND_CODE', ascending: false } }
    }
  });

describe('review snapshot settings', () => {
  it('saves settings and canonical RHS filters without runtime data, and restores full state without target-reset races', () => {
    expect.hasAssertions();
    let state = configure(rootReducer(undefined, setTargetOn(7)));
    state = rootReducer(
      state,
      setUnifiedFilterItem('rhs', {
        mainStatusFilters: ['GOOD', 'BAD'],
        activeOnly: true,
        filters: { detail: { value: 'v1' } },
        sortings: { observation: 'desc' },
        resetVersion: 9
      })
    );
    const native = { buffers: new Uint8Array(10) };
    native.self = native;
    state.selectionReducers.review = {
      ...state.selectionReducers.review,
      pending: Promise.resolve(),
      native,
      dialogOpen: true
    };
    state.previewReducers.molecule.imageCache = { 1: '<svg />' };
    const saved = createSnapshotStateForSaving(state);
    expect(saved.selectionReducers.review).toStrictEqual(normalizeReviewSettings(state.selectionReducers.review));
    expect(saved.selectionReducers).not.toHaveProperty('reviewRevision');
    expect(saved.selectionReducers.unifiedFilter.rhs).not.toHaveProperty('resetVersion');
    expect(saved.previewReducers.molecule.imageCache).toStrictEqual({});
    expect(() => JSON.stringify(saved)).not.toThrow();
    const restored = rootReducer(undefined, setEntireState(saved));
    expect(restored.selectionReducers.review.open).toBe(true);
    expect(restored.selectionReducers.review.height).toBe(452);
    expect(restored.selectionReducers.unifiedFilter.rhs.mainStatusFilters).toStrictEqual(['GOOD', 'BAD']);
    expect(restored.selectionReducers.unifiedFilter.rhs.activeOnly).toBe(true);
    expect(rootReducer(restored, setTargetOn(7)).selectionReducers.review).toBe(restored.selectionReducers.review);
  });

  it('defaults old and partially populated snapshots on full and incremental restore without leaking previous RHS predicates', () => {
    expect.hasAssertions();
    const current = configure(rootReducer(undefined, setTargetOn(7)));
    current.selectionReducers.unifiedFilter = {
      rhs: {
        mainStatusFilters: ['BAD'],
        activeOnly: true,
        filters: { molecule: { smiles: 'N' }, detail: { value: 'old' } }
      }
    };
    current.apiReducers.quality_statuses = [{ id: 4, status: 'GOOD' }];
    current.selectionReducers.filter = { active: true, value: 'previous LHS setting' };
    current.previewReducers.molecule.imageCache = { 1: '<svg />' };
    const older = { selectionReducers: { toBeDisplayedList: [], unifiedFilter: { detailRHS: { value: 'legacy' } } } };
    const merged = mergeSnapshotStateWithCurrentData(current, older);
    const incremental = selectionReducers(current.selectionReducers, reloadSelectionReducer(merged.selectionReducers));
    const full = rootReducer(current, setEntireState(older));
    [incremental, full.selectionReducers].forEach(selection => {
      expect(selection.review).toStrictEqual(normalizeReviewSettings());
      expect(selection.unifiedFilter.rhs).toMatchObject({
        mainStatusFilters: [],
        activeOnly: false,
        filters: { detail: { value: 'legacy' } },
        sortings: {}
      });
      expect(selection.unifiedFilter.rhs.filters).not.toHaveProperty('molecule');
      expect(selection.unifiedFilter.rhs.generalFilter).toStrictEqual({ active: false });
      expect(selection.reviewRevision).toBeGreaterThan(current.selectionReducers.reviewRevision);
    });
    expect(merged.apiReducers.quality_statuses).toStrictEqual(current.apiReducers.quality_statuses);
    expect(merged.selectionReducers.filter).toStrictEqual(current.selectionReducers.filter);
    expect(merged.previewReducers.molecule.imageCache).toStrictEqual({ 1: '<svg />' });
    const partial = mergeSnapshotStateWithCurrentData(current, {
      selectionReducers: { review: { owner: 'rhs' }, unifiedFilter: { rhs: { filters: { detail: { value: 'new' } } } } }
    });
    expect(partial.selectionReducers.review.height).toBe(DEFAULT_REVIEW_HEIGHT);
    expect(partial.selectionReducers.review.open).toBe(false);
    expect(partial.selectionReducers.unifiedFilter.rhs.filters).toStrictEqual({ detail: { value: 'new' } });
  });

  it('resets Review and image inputs when the target changes, preserving unrelated LHS and runtime contracts', () => {
    expect.hasAssertions();
    const current = configure(rootReducer(undefined, setTargetOn(7)));
    current.selectionReducers.unifiedFilter = { detail: { value: 'lhs' }, rhs: { mainStatusFilters: ['BAD'] } };
    current.previewReducers.molecule.imageCache = { 1: '<svg />' };
    const next = rootReducer(current, setTargetOn(8));
    expect(next.selectionReducers.review).toStrictEqual(normalizeReviewSettings());
    expect(next.selectionReducers.unifiedFilter.rhs).toStrictEqual({
      resetVersion: 1,
      generalFilter: { active: false }
    });
    expect(next.selectionReducers.unifiedFilter.detail).toBe(current.selectionReducers.unifiedFilter.detail);
    expect(next.previewReducers.molecule.imageCache).toStrictEqual({});
    expect(next.selectionReducers.fragmentDisplayList).toBe(current.selectionReducers.fragmentDisplayList);
    expect(next.nglReducers).toBe(current.nglReducers);
  });

  it('preserves configuration identity for repeated callbacks and normalizes malformed settings', () => {
    expect.hasAssertions();
    const state = configure(rootReducer(undefined, {}));
    expect(configure(state)).toBe(state);
    const changed = rootReducer(state, { type: SET_REVIEW_SETTINGS, settings: { height: 500 } });
    expect(changed.selectionReducers.review.orderingBySide).toBe(state.selectionReducers.review.orderingBySide);
    expect(changed.selectionReducers.review.ligandGroups).toBe(state.selectionReducers.review.ligandGroups);
    expect(
      normalizeReviewSettings({ owner: 'invalid', open: true, height: NaN, orderingBySide: { rhs: {} } })
    ).toMatchObject({
      owner: null,
      open: false,
      height: DEFAULT_REVIEW_HEIGHT,
      orderingBySide: { rhs: { sortOption: 'POSE_NAME', ascending: true } }
    });
  });
});
