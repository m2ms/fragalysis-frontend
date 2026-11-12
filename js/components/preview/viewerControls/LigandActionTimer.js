import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { Typography } from '@mui/material';
import { getLigandActionTiming, subscribeLigandActionTiming } from '../../../reducers/ngl/ligandActionTiming';
import RichTooltip from '../../tooltip/RichTooltip';

export const formatLigandActionTime = milliseconds => {
  const tenths = Math.floor(Math.max(0, milliseconds) / 100);
  const seconds = ((tenths % 600) / 10).toFixed(1);
  return tenths < 600 ? `${seconds}s` : `${Math.floor(tenths / 600)}:${seconds.padStart(4, '0')}`;
};

export const LigandActionTimer = () => {
  const timing = useSyncExternalStore(subscribeLigandActionTiming, getLigandActionTiming, getLigandActionTiming);
  const [clock, setClock] = useState(() => performance.now());
  useEffect(() => {
    if (timing?.status !== 'running') return undefined;
    const interval = setInterval(() => setClock(performance.now()), 250);
    return () => clearInterval(interval);
  }, [timing]);
  const elapsed = timing ? formatLigandActionTime((timing.finishedAt ?? clock) - timing.startedAt) : '—';
  const actionLabel = !timing
    ? 'Time'
    : timing.status === 'failed'
    ? 'Failed'
    : timing.status === 'cancelled'
    ? 'Stopped'
    : timing.kind === 'load'
    ? 'Load'
    : 'Remove';
  const skippedLabel = timing?.skippedCount
    ? `${timing.skippedCount} ${timing.skippedCount === 1 ? 'ligand' : 'ligands'} skipped`
    : '';
  const label = skippedLabel
    ? timing.status === 'completed'
      ? skippedLabel
      : `${actionLabel} · ${skippedLabel}`
    : actionLabel;
  return (
    <RichTooltip path="ligandActionTime">
      <Typography
        component="div"
        variant="caption"
        color={timing?.status === 'failed' ? 'error' : timing?.status === 'running' ? 'primary' : 'textSecondary'}
        data-testid="ligand-action-timer"
        data-status={timing?.status || 'idle'}
        aria-label={
          timing
            ? `Ligand ${timing.kind}: ${timing.status}, elapsed ${elapsed}${skippedLabel ? `, ${skippedLabel}` : ''}`
            : 'Ligand action timer: idle'
        }
        sx={{ flexShrink: 0, lineHeight: 1.3, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}
      >
        <div>{label}</div>
        <div>{elapsed}</div>
      </Typography>
    </RichTooltip>
  );
};
