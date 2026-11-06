import React, { useRef, useSyncExternalStore } from 'react';
import { getBulkLigandSettings, subscribeBulkLigandSettings } from '../../reducers/ngl/bulkLigandSettings';

// Moorhen 0.22.7 does not expose a Models-panel slot. The version-checked build
// loader wraps only that component, leaving its container and canvas untouched.
export const withDeferredModelsPanel = (ModelsPanel, modalId) => {
  const DeferredModelsPanel = props => {
    const settings = useSyncExternalStore(subscribeBulkLigandSettings, getBulkLigandSettings, getBulkLigandSettings);
    const isOpen = useSyncExternalStore(
      props.store.subscribe,
      () => props.store.getState().modals.activeModals.includes(modalId),
      () => false
    );
    const hasOpened = useRef(false);
    if (isOpen) hasOpened.current = true;
    // Retain native card state after first use. Repeated unmount/remount would
    // rerun card initialization, which can reset native visibility and controls.
    if (settings.deferModelsUI && !hasOpened.current && !isOpen) return null;
    return <ModelsPanel {...props} />;
  };
  DeferredModelsPanel.displayName = 'DeferredMoorhenModelsPanel';
  return DeferredModelsPanel;
};
