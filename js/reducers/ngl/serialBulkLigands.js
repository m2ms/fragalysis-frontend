// Scheduling belongs to this live bulk request, not to saved snapshot state.
// Snapshot preparation clones intents, so restored items use normal scheduling.
const serialBulkLigands = new WeakSet();

export const markSerialBulkLigand = item => serialBulkLigands.add(item);

export const isSerialBulkLigand = item => serialBulkLigands.has(item);
