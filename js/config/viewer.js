export const VIEWER_ENGINE = 'moorhen';

// Experimental limit for complete LHS bulk ligand loads (download through rendering).
// Compare 2, 4 and 8 on codex/lhs-ligand-pool; not saved in snapshots.
export const LHS_BULK_LIGAND_CONCURRENCY = 4;

// true: NGL contact detection and per-type colours, rendered by Moorhen.
// false: Moorhen/Coot's native hydrogen bonds and purple dashed rendering.
// Initial value for Preferences > NGL style interactions; not saved in snapshots.
export const USE_NGL_STYLE_INTERACTIONS = false;

export const viewerConfig = Object.freeze({
  viewerEngine: VIEWER_ENGINE,
  selectionSource: 'fixed'
});
