import React, { useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  TextField,
  Typography
} from '@mui/material';
import {
  BULK_LIGAND_PRESETS,
  DEFAULT_BULK_LIGAND_SETTINGS,
  bulkLigandPreset,
  getBulkLigandPreset,
  getBulkLigandSettings,
  setBulkLigandSettings,
  validBulkLigandSettings
} from '../../../reducers/ngl/bulkLigandSettings';

export const BulkLigandSettingsDialog = ({ onClose }) => {
  const [draft, setDraft] = useState(getBulkLigandSettings);
  const update = (key, value) =>
    setDraft(previous => {
      const next = { ...previous, [key]: value };
      // Do not leave an invalid value hidden behind a different strategy/toggle.
      const hidden =
        key === 'strategy'
          ? next.strategy === 'pool'
            ? ['downloads', 'renders']
            : next.strategy === 'pipeline'
            ? ['poolSize']
            : ['poolSize', 'downloads', 'renders']
          : key === 'coalesceDraw' && !value
          ? ['drawMaxWaitMs']
          : [];
      hidden.forEach(field => {
        if (!Number.isInteger(next[field]) || next[field] < 1) next[field] = DEFAULT_BULK_LIGAND_SETTINGS[field];
      });
      return next;
    });
  const numeric = (key, label) => (
    <TextField
      label={label}
      type="number"
      value={draft[key]}
      onChange={event => update(key, event.target.value === '' ? '' : Number(event.target.value))}
      slotProps={{ htmlInput: { min: 1, step: 1 } }}
      error={!Number.isInteger(draft[key]) || draft[key] < 1}
      helperText={!Number.isInteger(draft[key]) || draft[key] < 1 ? 'Enter a positive whole number' : ' '}
      fullWidth
    />
  );

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="bulk-ligand-settings-title">
      <DialogTitle id="bulk-ligand-settings-title">Bulk ligand loading</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Settings apply to new bulk hit-ligand requests. Requests with different settings wait for the current strategy
          to finish. For comparison, remove the ligands, choose a preset, then load the same group.
        </Typography>
        <Box sx={{ display: 'grid', gap: 2 }}>
          <TextField
            select
            label="Preset"
            value={getBulkLigandPreset(draft)}
            onChange={event => setDraft(bulkLigandPreset(event.target.value))}
            fullWidth
          >
            {Object.entries(BULK_LIGAND_PRESETS).map(([key, preset]) => (
              <MenuItem key={key} value={key}>
                {preset.label}
              </MenuItem>
            ))}
            <MenuItem value="custom" disabled>
              Custom settings
            </MenuItem>
          </TextField>
          <TextField
            select
            label="Loading strategy"
            value={draft.strategy}
            onChange={event => update('strategy', event.target.value)}
            fullWidth
          >
            <MenuItem value="unrestricted">Unrestricted</MenuItem>
            <MenuItem value="serial">Serial: one complete load at a time</MenuItem>
            <MenuItem value="pool">Limited pool: cap complete loads</MenuItem>
            <MenuItem value="pipeline">Pipeline: separate preparation and rendering</MenuItem>
          </TextField>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 2 }}>
            {draft.strategy === 'pool' && numeric('poolSize', 'Concurrent complete loads')}
            {draft.strategy === 'pipeline' && numeric('downloads', 'Coordinate preparation slots')}
            {draft.strategy === 'pipeline' && numeric('renders', 'Native rendering slots')}
          </Box>
          <Box>
            <FormControlLabel
              label="Batch request updates"
              control={
                <Checkbox checked={draft.batchRequests} onChange={(_, checked) => update('batchRequests', checked)} />
              }
            />
            <FormControlLabel
              label="Coalesce completion repaints"
              control={
                <Checkbox checked={draft.coalesceDraw} onChange={(_, checked) => update('coalesceDraw', checked)} />
              }
            />
          </Box>
          {draft.coalesceDraw && numeric('drawMaxWaitMs', 'Repaint fallback delay (ms)')}
          <Box>
            <Typography variant="subtitle2">Native viewer experiments</Typography>
            <FormControlLabel
              label="Defer native Models UI until first opened"
              control={
                <Checkbox checked={draft.deferModelsUI} onChange={(_, checked) => update('deferModelsUI', checked)} />
              }
            />
            <Typography variant="caption" color="textSecondary" component="p">
              Applies immediately while the native Models panel has never been opened. After first use it stays mounted
              to retain its controls. A fresh page resets that first-use state.
            </Typography>
            <FormControlLabel
              label="Skip redundant opaque buffer updates"
              control={
                <Checkbox
                  checked={draft.reduceNativeUpdates}
                  onChange={(_, checked) => update('reduceNativeUpdates', checked)}
                />
              }
            />
            <Typography variant="caption" color="textSecondary" component="p">
              New bulk ligands avoid repeated opacity uploads and label updates when their bond buffers are opaque. They
              still wait for complete geometry before appearing.
            </Typography>
            <FormControlLabel
              label="Batch native buffer publication"
              control={
                <Checkbox
                  checked={draft.batchNativeBuffers}
                  onChange={(_, checked) => update('batchNativeBuffers', checked)}
                />
              }
            />
            <Typography variant="caption" color="textSecondary" component="p">
              Groups ready opaque bulk ligands and their completion repaint into one viewer update per frame.
              Applies to new bulk loads; translucent styles and later edits keep their normal updates.
            </Typography>
            <FormControlLabel
              label="Low-detail bulk ligands"
              control={<Checkbox checked={draft.lowDetail} onChange={(_, checked) => update('lowDetail', checked)} />}
            />
            <Typography variant="caption" color="textSecondary" component="p">
              New default bulk ligand styles use bond smoothness 1 instead of 3. Saved or customized styles keep their
              settings. Remove and reload the group to compare detail.
            </Typography>
          </Box>
          <Typography variant="caption" color="textSecondary">
            Preparation slots include downloaded ligands waiting to render. Settings reset on page reload and are not
            saved in snapshots. Individual toggles and restored snapshots keep their usual loading behavior.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!validBulkLigandSettings(draft)}
          onClick={() => {
            setBulkLigandSettings(draft);
            onClose();
          }}
        >
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  );
};
