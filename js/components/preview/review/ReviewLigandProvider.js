import React, { createContext, useContext, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { useStore } from 'react-redux';
import { NglContext } from '../../nglView/nglProvider';
import { VIEWS } from '../../../constants/constants';
import { createReviewLigandController } from './reviewLigandController';
import { resolveRhsReviewGroup } from './rhsReviewInspirations';

const ReviewLigandContext = createContext(null);
const EMPTY = {};
const noopSubscribe = () => () => {};
const emptySnapshot = () => EMPTY;

export const ReviewLigandProvider = ({ children }) => {
  const store = useStore();
  const viewer = useContext(NglContext);
  const viewerRef = useRef(viewer);
  viewerRef.current = viewer;
  const controller = useMemo(
    () =>
      createReviewLigandController({
        store,
        resolveGroup: resolveRhsReviewGroup,
        getViewer: () => viewerRef.current?.getViewerAdapter?.(VIEWS.MAJOR_VIEW)
      }),
    [store]
  );
  useEffect(() => controller.start(), [controller]);
  const ready = Boolean(viewer?.getViewerAdapter?.(VIEWS.MAJOR_VIEW));
  const value = useMemo(() => ({ controller, ready }), [controller, ready]);
  return <ReviewLigandContext.Provider value={value}>{children}</ReviewLigandContext.Provider>;
};

export const useReviewLigand = id => {
  const context = useContext(ReviewLigandContext);
  const state = useSyncExternalStore(
    context?.controller.subscribe || noopSubscribe,
    context?.controller.getSnapshot || emptySnapshot
  );
  return { ...state[String(id)], ready: context?.ready || false, toggle: () => context?.controller.toggle(id) };
};
