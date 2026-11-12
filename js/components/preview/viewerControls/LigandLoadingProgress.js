import React, { memo, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Box, IconButton, Typography } from '@mui/material';
import { Tune } from '@mui/icons-material';
import { NGL_OBJECTS } from '../../../reducers/ngl/constants';
import RichTooltip from '../../tooltip/RichTooltip';
import { BulkLigandSettingsDialog } from './BulkLigandSettingsDialog';
import { LigandActionTimer } from './LigandActionTimer';

// Webpack replaces NODE_ENV, so this describes the loaded bundle even if
// webpack-stats.json is changed by another build after the page has loaded.
const IS_PRODUCTION_BUILD = process.env.NODE_ENV === 'production';
const BUILD_MODE = IS_PRODUCTION_BUILD ? 'production' : 'development';

// Count current hit-ligand intent, not cumulative downloads or queued removals.
// Native completion needs both its queue acknowledgement and matching metadata.
export const getLigandLoadingProgress = (intents = [], coordinates = [], observations = [], objects = {}) => {
  const requested = new Map();
  const acknowledged = new Set();
  intents.forEach(item => {
    if (item.type === NGL_OBJECTS.LIGAND) {
      requested.set(item.id, item);
      if (item.display !== false && item.rendered === true) acknowledged.add(item.id);
    }
  });
  const hasCoordinates = value => typeof value === 'string' && value.trim().length > 0;
  const available = new Set(coordinates.filter(entry => hasCoordinates(entry.ligandData)).map(entry => entry.obsId));
  const observationsById = new Map(observations.map(observation => [observation.id, observation]));
  let total = 0;
  let downloaded = 0;
  let rendered = 0;
  requested.forEach(item => {
    if (item.display === false) return;
    total++;
    const observation = observationsById.get(item.id);
    const object = observation && objects[`${observation.code || observation.virtual_name}_${NGL_OBJECTS.LIGAND}`];
    const ready = acknowledged.has(item.id) && object?.OBJECT_TYPE === 'LIGAND' && object.moleculeId === item.id;
    if (ready || available.has(item.id) || hasCoordinates(observation?.sdf_info)) downloaded++;
    if (ready) rendered++;
  });
  return { total, downloaded, rendered };
};

export const LigandLoadingProgress = memo(() => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const intents = useSelector(state => state.selectionReducers.toBeDisplayedList);
  const coordinates = useSelector(state => state.apiReducers.ligandData);
  const observations = useSelector(state => state.apiReducers.all_mol_lists);
  const objects = useSelector(state => state.nglReducers.objectsInView);
  const { total, downloaded, rendered } = useMemo(
    () => getLigandLoadingProgress(intents, coordinates, observations, objects),
    [intents, coordinates, observations, objects]
  );

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0, gap: 0.5 }}>
      <RichTooltip path="ligandProgress">
        <Typography
          component="div"
          variant="caption"
          color="textSecondary"
          aria-label={`Hit ligands: downloaded ${downloaded} of ${total}, rendered ${rendered} of ${total}`}
          data-testid="ligand-loading-progress"
          sx={{ minWidth: 0, lineHeight: 1.3, fontVariantNumeric: 'tabular-nums' }}
        >
          <div>
            Downloaded {downloaded}/{total}
          </div>
          <div>
            Rendered {rendered}/{total}
          </div>
        </Typography>
      </RichTooltip>
      <RichTooltip path="ligandLoadingSettings">
        <IconButton size="small" aria-label="Ligand loading settings" onClick={() => setSettingsOpen(true)}>
          <Tune fontSize="small" />
        </IconButton>
      </RichTooltip>
      <LigandActionTimer />
      <Typography
        component="span"
        variant="caption"
        aria-label={`Build mode: ${BUILD_MODE}`}
        title={`${IS_PRODUCTION_BUILD ? 'Production' : 'Development'} build`}
        data-testid="build-mode-indicator"
        data-build-mode={BUILD_MODE}
        sx={{
          flexShrink: 0,
          fontWeight: 600,
          whiteSpace: 'nowrap',
          color: IS_PRODUCTION_BUILD ? 'success.main' : 'warning.dark',
          border: '1px solid',
          borderColor: 'currentColor',
          borderRadius: 1,
          px: 0.5,
          lineHeight: 1.5
        }}
      >
        {IS_PRODUCTION_BUILD ? 'PROD' : 'DEV'}
      </Typography>
      {settingsOpen && <BulkLigandSettingsDialog onClose={() => setSettingsOpen(false)} />}
    </Box>
  );
});
