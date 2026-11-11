import {
  LHS_BULK_LIGAND_CONCURRENCY,
  LHS_BULK_LIGAND_DOWNLOAD_CONCURRENCY,
  LHS_BULK_LIGAND_DRAW_MAX_WAIT_MS,
  LHS_BULK_LIGAND_RENDER_CONCURRENCY,
  LHS_BULK_LIGAND_SCHEDULING
} from '../../config/viewer';

export const DEFAULT_BULK_LIGAND_SETTINGS = Object.freeze({
  strategy: LHS_BULK_LIGAND_SCHEDULING,
  poolSize: LHS_BULK_LIGAND_CONCURRENCY,
  downloads: LHS_BULK_LIGAND_DOWNLOAD_CONCURRENCY,
  renders: LHS_BULK_LIGAND_RENDER_CONCURRENCY,
  drawMaxWaitMs: LHS_BULK_LIGAND_DRAW_MAX_WAIT_MS,
  batchRequests: true,
  coalesceDraw: true,
  deferModelsUI: false,
  reduceNativeUpdates: false,
  batchNativeBuffers: false,
  lowDetail: false
});

export const BULK_LIGAND_PRESETS = {
  original: { label: 'Original (unrestricted)', strategy: 'unrestricted', batchRequests: false, coalesceDraw: false },
  serial: { label: 'Experiment 1: serial', strategy: 'serial', batchRequests: false, coalesceDraw: false },
  pool: { label: 'Experiment 2: limited pool', strategy: 'pool', batchRequests: false, coalesceDraw: false },
  pipeline: { label: 'Experiment 3: pipeline', strategy: 'pipeline', batchRequests: false, coalesceDraw: false },
  batched: {
    label: 'Experiment 4: batching and repaints',
    strategy: 'unrestricted',
    batchRequests: true,
    coalesceDraw: true
  },
  combined: { label: 'Combined optimizations', strategy: 'pipeline', batchRequests: true, coalesceDraw: true },
  native: {
    label: 'Combined + native viewer experiments',
    strategy: 'pipeline',
    batchRequests: true,
    coalesceDraw: true,
    deferModelsUI: true,
    reduceNativeUpdates: true,
    batchNativeBuffers: true,
    lowDetail: true
  }
};

export const bulkLigandPreset = name => {
  const { label, ...settings } = BULK_LIGAND_PRESETS[name];
  return { ...DEFAULT_BULK_LIGAND_SETTINGS, ...settings };
};

export const getBulkLigandPreset = settings =>
  Object.keys(BULK_LIGAND_PRESETS).find(name => {
    const preset = bulkLigandPreset(name);
    return Object.keys(preset).every(key => preset[key] === settings[key]);
  }) || 'custom';

export const validBulkLigandSettings = settings =>
  ['unrestricted', 'serial', 'pool', 'pipeline'].includes(settings.strategy) &&
  ['poolSize', 'downloads', 'renders', 'drawMaxWaitMs'].every(
    key => Number.isInteger(settings[key]) && settings[key] > 0
  ) &&
  typeof settings.batchRequests === 'boolean' &&
  typeof settings.coalesceDraw === 'boolean' &&
  ['deferModelsUI', 'reduceNativeUpdates', 'batchNativeBuffers', 'lowDetail'].every(key => typeof settings[key] === 'boolean');

// Tab-local experimental controls never enter application Redux, saved snapshots,
// native objects or API payloads.
let current = DEFAULT_BULK_LIGAND_SETTINGS;
const listeners = new Set();
export const getBulkLigandSettings = () => current;
export const subscribeBulkLigandSettings = listener => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
export const setBulkLigandSettings = settings => {
  if (!validBulkLigandSettings(settings)) throw new TypeError('Invalid bulk ligand loading settings');
  const next = Object.fromEntries(Object.keys(DEFAULT_BULK_LIGAND_SETTINGS).map(key => [key, settings[key]]));
  if (Object.keys(next).every(key => current[key] === next[key])) return;
  current = Object.freeze(next);
  listeners.forEach(listener => listener());
};

export const getBulkLigandLimits = settings => {
  const wholeLoad = settings.strategy === 'serial' ? 1 : settings.strategy === 'pool' ? settings.poolSize : Infinity;
  return {
    wholeLoad,
    downloads: settings.strategy === 'pipeline' ? settings.downloads : wholeLoad,
    renders: settings.strategy === 'pipeline' ? settings.renders : wholeLoad
  };
};
