import {
  buildLoginRedirectUrl,
  buildAuthRedirectUrl,
  getTargetFromPathname,
  isPreviewPath,
  capturePreviewStateForLogin,
  readStoredPreviewState,
  clearStoredPreviewState,
  restorePreviewStateFromLogin
} from './loginStatePersistence';
import { URLS } from '../routes/constants';
import { saveStore } from '../helpers/globalStore';

describe('buildAuthRedirectUrl / buildLoginRedirectUrl / isPreviewPath', () => {
  const previewPath = '/viewer/react/preview/target/my-target/project-a';

  test('login: preview path appends encoded next param to the login url', () => {
    expect(isPreviewPath(previewPath)).toBe(true);
    expect(buildLoginRedirectUrl(previewPath)).toBe(`${URLS.login}?next=${encodeURIComponent(previewPath)}`);
    expect(buildAuthRedirectUrl(URLS.login, previewPath)).toBe(`${URLS.login}?next=${encodeURIComponent(previewPath)}`);
  });

  test('logout: preview path appends encoded next param to the logout url', () => {
    expect(buildAuthRedirectUrl(URLS.logout, previewPath)).toBe(
      `${URLS.logout}?next=${encodeURIComponent(previewPath)}`
    );
  });

  test('non-preview path returns the plain url for both login and logout (Django falls back to landing)', () => {
    const landing = '/viewer/react/landing/';
    expect(isPreviewPath(landing)).toBe(false);
    expect(buildAuthRedirectUrl(URLS.login, landing)).toBe(URLS.login);
    expect(buildAuthRedirectUrl(URLS.logout, landing)).toBe(URLS.logout);
  });

  test('guards against non-string input', () => {
    expect(isPreviewPath(undefined)).toBe(false);
    expect(isPreviewPath(null)).toBe(false);
    expect(buildAuthRedirectUrl(URLS.login, undefined)).toBe(URLS.login);
  });
});

describe('getTargetFromPathname', () => {
  test('extracts the target segment from a preview path', () => {
    expect(getTargetFromPathname('/viewer/react/preview/target/my-target/project-a')).toBe('my-target');
    expect(getTargetFromPathname('/viewer/react/preview/target/solo-target/')).toBe('solo-target');
  });

  test('returns null for non-preview paths or missing target', () => {
    expect(getTargetFromPathname('/viewer/react/landing/')).toBeNull();
    expect(getTargetFromPathname(URLS.target)).toBeNull();
    expect(getTargetFromPathname(undefined)).toBeNull();
  });
});

describe('capture / read / clear round-trip', () => {
  const fakeStore = () => ({
    getState: () => ({
      apiReducers: { target_on: 'my-target' },
      selectionReducers: {
        toBeDisplayedList: [{ id: 101, type: 'ligand', display: true, center: false, rendered: false }],
        lhs_selectedTagList: [42],
        rhs_selectedTagList: [],
        rhsPoseNavigationConfig: { order: 'remove-first' }
      },
      datasetsReducers: {
        toBeDisplayedList: { 7: [{ id: 900, type: 'ligand', display: true }] }
      },
      nglReducers: {
        nglOrientations: { major_view: { elements: [1, 2, 3] } }
      },
      previewReducers: { viewerControls: { sidesOpen: { LHS: true, RHS: false } } }
    })
  });

  beforeEach(() => {
    window.sessionStorage.clear();
  });

  test('capture stores a payload keyed by target that readStoredPreviewState returns', () => {
    saveStore(fakeStore());
    expect(capturePreviewStateForLogin()).toBe(true);

    const stored = readStoredPreviewState('my-target');
    expect(stored).not.toBeNull();
    expect(stored.target).toBe('my-target');
    expect(stored.selectionReducers.toBeDisplayedList).toEqual([
      { id: 101, type: 'ligand', display: true, center: false, rendered: false }
    ]);
    expect(stored.datasetsReducers.toBeDisplayedList).toEqual({ 7: [{ id: 900, type: 'ligand', display: true }] });
    expect(stored.nglReducers.snapshotNglOrientation).toEqual({ elements: [1, 2, 3] });
    expect(stored.previewReducers.viewerControls.sidesOpen).toEqual({ LHS: true, RHS: false });
  });

  test('capture returns false when there is no target in state', () => {
    saveStore({ getState: () => ({ apiReducers: {} }) });
    expect(capturePreviewStateForLogin()).toBe(false);
    expect(readStoredPreviewState('anything')).toBeNull();
  });

  test('readStoredPreviewState returns null for an unknown target', () => {
    saveStore(fakeStore());
    capturePreviewStateForLogin();
    expect(readStoredPreviewState('other-target')).toBeNull();
  });

  test('clearStoredPreviewState removes the entry', () => {
    saveStore(fakeStore());
    capturePreviewStateForLogin();
    expect(readStoredPreviewState('my-target')).not.toBeNull();
    clearStoredPreviewState('my-target');
    expect(readStoredPreviewState('my-target')).toBeNull();
  });
});

describe('restorePreviewStateFromLogin', () => {
  test('dispatches the expected slice reload actions and returns the saved orientation', async () => {
    const dispatched = [];
    const dispatch = jest.fn(action => {
      dispatched.push(action);
      return undefined;
    });

    const stored = {
      target: 'my-target',
      selectionReducers: { toBeDisplayedList: [{ id: 1, type: 'ligand' }] },
      datasetsReducers: { toBeDisplayedList: { 7: [] } },
      nglReducers: { snapshotNglOrientation: { elements: [9, 8, 7] } },
      previewReducers: { viewerControls: { sidesOpen: { LHS: true, RHS: false } } }
    };

    // Call the thunk directly so its return value (the saved orientation) is observable.
    const returned = await restorePreviewStateFromLogin(stored)(dispatch);

    expect(returned).toEqual({ elements: [9, 8, 7] });

    const types = dispatched.map(a => a.type);
    // isSnapshot set to suppress the initial-load defaults
    expect(types.some(t => t && t.endsWith('SET_IS_SNAPSHOT'))).toBe(true);
    // selection + datasets reload actions
    expect(types.some(t => t && t.endsWith('RELOAD_SELECTION_REDUCER'))).toBe(true);
    expect(types.some(t => t && t.endsWith('SET_DATASETS_STATE_FROM_SNAPSHOT'))).toBe(true);
    // orientation applied via the ngl snapshot state action
    expect(types.some(t => t && t.endsWith('SET_NGL_STATE_FROM_CURRENT_SNAPSHOT'))).toBe(true);
    // viewer side toggles
    expect(types.filter(t => t && t.endsWith('TURN_SIDE')).length).toBe(2);
  });

  test('returns null and dispatches nothing for a null stored payload', async () => {
    const dispatch = jest.fn();
    const returned = await restorePreviewStateFromLogin(null)(dispatch);
    expect(returned).toBeNull();
    expect(dispatch).not.toHaveBeenCalled();
  });
});
