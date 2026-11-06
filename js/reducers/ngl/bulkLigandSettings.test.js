import {
  BULK_LIGAND_PRESETS,
  bulkLigandPreset,
  getBulkLigandLimits,
  getBulkLigandPreset,
  getBulkLigandSettings,
  setBulkLigandSettings
} from './bulkLigandSettings';
import { getBulkLigandSettingsForItem, isBulkLigand, markBulkLigand } from './bulkLigands';

describe('bulk ligand experiment settings', () => {
  it('offers the original behavior, all four experiments and the combined mode', () => {
    expect.hasAssertions();
    expect(Object.keys(BULK_LIGAND_PRESETS)).toStrictEqual([
      'original',
      'serial',
      'pool',
      'pipeline',
      'batched',
      'combined',
      'native'
    ]);
    expect(getBulkLigandLimits(bulkLigandPreset('serial'))).toStrictEqual({ wholeLoad: 1, downloads: 1, renders: 1 });
    expect(getBulkLigandLimits(bulkLigandPreset('pool'))).toStrictEqual({ wholeLoad: 4, downloads: 4, renders: 4 });
    expect(getBulkLigandLimits(bulkLigandPreset('combined'))).toStrictEqual({
      wholeLoad: Infinity,
      downloads: 6,
      renders: 2
    });
    expect(getBulkLigandLimits(bulkLigandPreset('original'))).toStrictEqual({
      wholeLoad: Infinity,
      downloads: Infinity,
      renders: Infinity
    });
    expect(bulkLigandPreset('original').batchRequests).toBe(false);
    expect(bulkLigandPreset('original').coalesceDraw).toBe(false);
    expect(bulkLigandPreset('batched').batchRequests).toBe(true);
    expect(bulkLigandPreset('combined').deferModelsUI).toBe(false);
    expect(bulkLigandPreset('native')).toMatchObject({
      deferModelsUI: true,
      reduceNativeUpdates: true,
      lowDetail: true
    });
    Object.keys(BULK_LIGAND_PRESETS).forEach(name => expect(getBulkLigandPreset(bulkLigandPreset(name))).toBe(name));
  });

  it('captures immutable settings per intent without changing snapshot payloads', () => {
    expect.hasAssertions();
    setBulkLigandSettings(bulkLigandPreset('combined'));
    const item = { id: 1, type: 'LIGAND', display: true };
    markBulkLigand(item);
    const captured = getBulkLigandSettingsForItem(item);
    setBulkLigandSettings(bulkLigandPreset('serial'));
    expect(captured.strategy).toBe('pipeline');
    expect(Object.isFrozen(captured)).toBe(true);
    expect(getBulkLigandSettings().strategy).toBe('serial');
    const saved = JSON.parse(JSON.stringify(item));
    expect(saved).toStrictEqual(item);
    expect(isBulkLigand(saved)).toBe(false);
    expect(getBulkLigandSettingsForItem(saved)).toBeUndefined();
    setBulkLigandSettings(bulkLigandPreset('combined'));
  });

  it.each([0, -1, 1.5, NaN])('rejects an invalid concurrency of %s without replacing active settings', value => {
    expect.hasAssertions();
    const previous = getBulkLigandSettings();
    expect(() => setBulkLigandSettings({ ...previous, downloads: value })).toThrow('Invalid bulk ligand');
    expect(getBulkLigandSettings()).toBe(previous);
  });
});
