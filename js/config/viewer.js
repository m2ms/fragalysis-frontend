export const VIEWER_ENGINE = 'moorhen';

// Experimental LHS bulk pipeline. The download window includes prepared items
// waiting for rendering, bounding prefetch memory. Neither setting is saved.
export const LHS_BULK_LIGAND_DOWNLOAD_CONCURRENCY = 6;
export const LHS_BULK_LIGAND_RENDER_CONCURRENCY = 2;

// true: NGL contact detection and per-type colours, rendered by Moorhen.
// false: Moorhen/Coot's native hydrogen bonds and purple dashed rendering.
// Initial value for Preferences > NGL style interactions; not saved in snapshots.
export const USE_NGL_STYLE_INTERACTIONS = false;

export const viewerConfig = Object.freeze({
  viewerEngine: VIEWER_ENGINE,
  selectionSource: 'fixed'
});
