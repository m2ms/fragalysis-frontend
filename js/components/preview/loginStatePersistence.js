import { URLS } from '../routes/constants';
import { deepClone } from '../../utils/objectUtils';
import { getStore } from '../helpers/globalStore';
import { setIsSnapshot } from '../../reducers/api/actions';
import { reloadSelectionReducer } from '../../reducers/selection/actions';
import { setDatasetsStateFromSnapshot } from '../datasets/redux/actions';
import { setNglStateFromCurrentSnapshot } from '../../reducers/ngl/actions';
import { turnSide } from './viewerControls/redux/actions';
import { VIEWS } from '../../constants/constants';

// sessionStorage key prefix. The full key is `<PREFIX><target>` so a saved view is
// only ever restored for the exact target it was captured on.
const STORAGE_KEY_PREFIX = 'fragalysis.loginRestore.';
const MARKER = '__fragalysisLoginRestore__';

export const isPreviewPath = pathname => {
  if (typeof pathname !== 'string') return false;
  return pathname.startsWith(URLS.target);
};

// Build the login URL. When we are on a preview page, append Django's `next` param so
// that after a successful login the browser returns to this exact preview URL instead of
// the default landing page. On any other page (e.g. landing) we keep the plain login URL,
// which lets Django fall back to its default redirect.
export const buildLoginRedirectUrl = pathname => {
  if (isPreviewPath(pathname)) {
    return `${URLS.login}?next=${encodeURIComponent(pathname)}`;
  }
  return URLS.login;
};

// Capture the scoped "what is selected / visible" state so it can be restored after the
// login round-trip reload. Mirrors the snapshot-save shape (toBeDisplayedList, orientation,
// navigator selections/toggles, pose navigation config) but only persists what we need to
// re-establish the user's view. Returns true when something was stored.
export const capturePreviewStateForLogin = () => {
  try {
    const store = getStore();
    if (!store) return false;

    const state = store.getState();
    const target = state.apiReducers?.target_on;
    if (!target) return false;

    const selection = state.selectionReducers || {};
    const datasets = state.datasetsReducers || {};
    const ngl = state.nglReducers || {};
    const viewerControls = state.previewReducers?.viewerControls || {};

    const payload = {
      [MARKER]: true,
      target,
      capturedAt: Date.now(),
      selectionReducers: {
        toBeDisplayedList: deepClone(selection.toBeDisplayedList || []),
        lhs_selectedTagList: deepClone(selection.lhs_selectedTagList || []),
        rhs_selectedTagList: deepClone(selection.rhs_selectedTagList || []),
        lhs_tagFilteringMode: selection.lhs_tagFilteringMode,
        lhs_displayAllMolecules: selection.lhs_displayAllMolecules,
        lhs_displayUntaggedMolecules: selection.lhs_displayUntaggedMolecules,
        lhs_tagDetailView: deepClone(selection.lhs_tagDetailView || null),
        rhs_tagFilteringMode: selection.rhs_tagFilteringMode,
        rhs_displayAllMolecules: selection.rhs_displayAllMolecules,
        rhs_displayUntaggedMolecules: selection.rhs_displayUntaggedMolecules,
        rhs_tagDetailView: deepClone(selection.rhs_tagDetailView || null),
        showDisplayedMoleculesLHS: selection.showDisplayedMoleculesLHS,
        showDisplayedMoleculesRHS: selection.showDisplayedMoleculesRHS,
        rhsPoseNavigationConfig: deepClone(selection.rhsPoseNavigationConfig || null)
      },
      datasetsReducers: {
        toBeDisplayedList: deepClone(datasets.toBeDisplayedList || {})
      },
      nglReducers: {
        // Only the major view orientation is user-facing on the preview page.
        snapshotNglOrientation: deepClone(ngl.nglOrientations?.[VIEWS.MAJOR_VIEW] || null)
      },
      previewReducers: {
        viewerControls: {
          sidesOpen: deepClone(viewerControls.sidesOpen || {})
        }
      }
    };

    window.sessionStorage.setItem(STORAGE_KEY_PREFIX + target, JSON.stringify(payload));
    return true;
  } catch (e) {
    console.error('capturePreviewStateForLogin failed', e);
    return false;
  }
};

// Read the stored state for a given target. Returns the parsed payload or null.
export const readStoredPreviewState = target => {
  try {
    if (!target) return null;
    const raw = window.sessionStorage.getItem(STORAGE_KEY_PREFIX + target);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed[MARKER] === true) return parsed;
    return null;
  } catch (e) {
    console.error('readStoredPreviewState failed', e);
    return null;
  }
};

export const clearStoredPreviewState = target => {
  try {
    if (!target) return;
    window.sessionStorage.removeItem(STORAGE_KEY_PREFIX + target);
  } catch (e) {
    // ignore storage errors
  }
};

// Restore the captured state on top of a freshly loaded preview. Reuses the same slice-level
// reload actions the snapshot-switch flow uses (so we do not replace the whole store or touch
// the NGL stage lifecycle). Returns the saved major-view orientation (or null) so the caller can
// apply it to the viewer once the restored objects have rendered.
export const restorePreviewStateFromLogin = stored => async dispatch => {
  if (!stored) return null;

  // Suppress the initial-load defaults (first alphabetical tag + first pose ligand) so they do
  // not overwrite the restored selection. initializeMolecules is guarded by !isSnapshot.
  dispatch(setIsSnapshot(true));

  if (stored.selectionReducers) {
    dispatch(reloadSelectionReducer(stored.selectionReducers));
  }

  if (stored.datasetsReducers) {
    dispatch(setDatasetsStateFromSnapshot(stored.datasetsReducers));
  }

  // Apply the saved major-view orientation. setNglStateFromCurrentSnapshot merges the payload
  // into nglReducers; we pass only snapshotNglOrientation so no transient queue counters leak in.
  if (stored.nglReducers && stored.nglReducers.snapshotNglOrientation) {
    dispatch(setNglStateFromCurrentSnapshot({ snapshotNglOrientation: stored.nglReducers.snapshotNglOrientation }));
  }

  if (stored.previewReducers?.viewerControls?.sidesOpen) {
    Object.entries(stored.previewReducers.viewerControls.sidesOpen).forEach(([side, open]) => {
      dispatch(turnSide(side, !!open, true));
    });
  }

  return stored.nglReducers?.snapshotNglOrientation || null;
};
