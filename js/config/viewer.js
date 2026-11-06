export const VIEWER_ENGINE = 'moorhen';

// Experimental bulk LHS repaint fallback for throttled/background animation frames.
export const LHS_BULK_LIGAND_DRAW_MAX_WAIT_MS = 100;

// Defaults for the live experiment dialog. Scheduling is never saved in snapshots.
export const LHS_BULK_LIGAND_SCHEDULING = 'pipeline';
export const LHS_BULK_LIGAND_CONCURRENCY = 4;
// The pipeline download window includes prepared items awaiting native admission.
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
