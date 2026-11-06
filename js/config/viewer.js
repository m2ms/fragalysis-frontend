export const VIEWER_ENGINE = 'moorhen';

// Experimental bulk LHS repaint fallback for throttled/background animation frames.
export const LHS_BULK_LIGAND_DRAW_MAX_WAIT_MS = 100;

// true: NGL contact detection and per-type colours, rendered by Moorhen.
// false: Moorhen/Coot's native hydrogen bonds and purple dashed rendering.
// Initial value for Preferences > NGL style interactions; not saved in snapshots.
export const USE_NGL_STYLE_INTERACTIONS = false;

export const viewerConfig = Object.freeze({
  viewerEngine: VIEWER_ENGINE,
  selectionSource: 'fixed'
});
