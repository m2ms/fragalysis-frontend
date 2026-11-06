// Scheduling belongs to this live bulk request, not to saved snapshot state.
// Snapshot preparation clones intents, so restored items use normal scheduling.
import { getBulkLigandSettings } from './bulkLigandSettings';

const bulkLigands = new WeakMap();

export const markBulkLigand = (item, settings = getBulkLigandSettings()) => bulkLigands.set(item, settings);

export const isBulkLigand = item => bulkLigands.has(item);

export const getBulkLigandSettingsForItem = item => bulkLigands.get(item);
