import { useStructureOperationQueue } from './useStructureOperationQueue';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { NGL_OBJECTS } from './constants';
import {
  appendFragmentDisplayList,
  appendQualityList,
  removeFromFragmentDisplayList,
  removeFromQualityList,
  removeFromToBeDisplayedList,
  updateInToBeDisplayedList
} from '../selection/actions';
import { generateMoleculeId, generateMoleculeObject } from '../../components/nglView/generatingObjects';
import { VIEWS } from '../../constants/constants';
import { NglContext } from '../../components/nglView/nglProvider';
import { getRandomColor } from '../../components/preview/molecule/utils/color';
import { readQualityInformation } from '../../viewer/qualityInformation';
import { deleteObject, loadObject } from './dispatchActions';
import { removeVector } from '../../components/preview/molecule/redux/dispatchActions';
import { getToBeDisplayedStructures } from './utils';
import { setNglOrientation } from './actions';
import { getBulkLigandSettingsForItem, isBulkLigand } from './bulkLigands';
import { DEFAULT_BULK_LIGAND_SETTINGS, getBulkLigandLimits } from './bulkLigandSettings';
import { markMoleculeInputError } from '../../viewer/moleculeInputErrors';
import {
  cancelLigandActionTiming,
  reconcileLigandActionTiming,
  trackLigandActionOperation
} from './ligandActionTiming';

export const useDisplayLigandLHS = () => {
  const dispatch = useDispatch();
  const store = useStore();
  const runStructureOperation = useStructureOperationQueue();
  const runLigandOperation = useCallback(
    (item, operation) => {
      const pending = runStructureOperation(item, operation);
      trackLigandActionOperation(item, pending);
      return pending;
    },
    [runStructureOperation]
  );
  const bulkLoading = useRef(new Map());
  const bulkRunSettings = useRef(null);
  const bulkWakeTimer = useRef(null);
  const mounted = useRef(false);
  const [bulkLoadVersion, setBulkLoadVersion] = useState(0);

  const wakeBulkPipeline = useCallback(() => {
    if (!mounted.current || bulkWakeTimer.current !== null) return;
    // Coalesce completions and yield a browser task before reusing capacity.
    bulkWakeTimer.current = setTimeout(() => {
      bulkWakeTimer.current = null;
      bulkLoading.current.forEach((entry, id) => {
        if (entry.phase === 'settled') bulkLoading.current.delete(id);
      });
      setBulkLoadVersion(version => version + 1);
    }, 0);
  }, []);

  useEffect(() => {
    mounted.current = true;
    const activeLoads = bulkLoading.current;
    return () => {
      mounted.current = false;
      cancelLigandActionTiming();
      if (bulkWakeTimer.current !== null) {
        clearTimeout(bulkWakeTimer.current);
        bulkWakeTimer.current = null;
      }
      activeLoads.forEach((entry, id) => {
        if (entry.phase === 'settled') {
          activeLoads.delete(id);
        } else if (entry.phase === 'ready') {
          entry.phase = 'cancelled';
          entry.admit(false);
          entry.admit = null;
        }
      });
    };
  }, []);

  const waitForBulkRender = useCallback(
    entry => {
      if (!mounted.current || !entry.isCurrent()) return Promise.resolve(false);
      if (entry.settings.strategy === 'unrestricted') {
        entry.phase = 'rendering';
        entry.nativeStarted = true;
        return Promise.resolve(true);
      }
      return new Promise(resolve => {
        entry.admit = resolve;
        entry.phase = 'ready';
        wakeBulkPipeline();
      });
    },
    [wakeBulkPipeline]
  );

  const toBeDisplayedList = useSelector(state => state.selectionReducers.toBeDisplayedList);
  const displayedLigands = useSelector(state => state.selectionReducers.fragmentDisplayList);
  const allObservations = useSelector(state => state.apiReducers.all_mol_lists);

  const { getNglView, getViewerAdapter } = useContext(NglContext);
  const stage = getNglView(VIEWS.MAJOR_VIEW) && getNglView(VIEWS.MAJOR_VIEW).stage;
  const viewerAdapter = getViewerAdapter(VIEWS.MAJOR_VIEW);

  // const isLoadingCurrentSnapshot = useSelector(state => state.projectReducers.isLoadingCurrentSnapshot);

  const displayLigand = useCallback(
    async (ligandData, bulkEntry) => {
      const data = allObservations.find(obs => obs.id === ligandData.id);
      if (!data) return 'cancelled';
      const colourToggle = getRandomColor(data);
      const molId = generateMoleculeId(data);

      let nativeLoadStarted = false;
      try {
        let moleculeObject = await dispatch(generateMoleculeObject(data, colourToggle));
        if (bulkEntry && (!(await waitForBulkRender(bulkEntry)) || !mounted.current || !bulkEntry.isCurrent()))
          return 'cancelled';
        let qualityInformation = dispatch(readQualityInformation(moleculeObject.name, moleculeObject.sdf_info));

        let hasAdditionalInformation =
          ligandData.withQuality === true &&
          qualityInformation &&
          qualityInformation.badids &&
          qualityInformation.badids.length !== 0;
        dispatch(appendFragmentDisplayList(molId));
        if (hasAdditionalInformation) {
          dispatch(appendQualityList(molId));
        }
        const settings = bulkEntry?.settings;

        nativeLoadStarted = true;
        await dispatch(
          loadObject({
            target: Object.assign({ display_div: VIEWS.MAJOR_VIEW }, moleculeObject),
            stage,
            previousRepresentations: ligandData.representations,
            loadQuality: hasAdditionalInformation,
            quality: qualityInformation,
            center: ligandData.center,
            ...(settings
              ? {
                  bulkLigandOptions: {
                    reduceNativeUpdates: settings.reduceNativeUpdates,
                    batchNativeBuffers: settings.batchNativeBuffers,
                    batchCootCommands: settings.batchCootCommands,
                    lowDetail: settings.lowDetail
                  }
                }
              : {}),
            ...(settings?.coalesceDraw ? { coalesceDraw: true, drawMaxWaitMs: settings.drawMaxWaitMs } : {})
          })
        );
        if (ligandData.center) {
          const currentOrientation = viewerAdapter.getOrientation();
          dispatch(setNglOrientation(currentOrientation, VIEWS.MAJOR_VIEW));
        }
        dispatch(updateInToBeDisplayedList({ id: data.id, rendered: true, type: NGL_OBJECTS.LIGAND }));
        return 'rendered';
      } catch (error) {
        // A superseded preparation must not remove the replacement snapshot's intent.
        if (!bulkEntry || bulkEntry.isCurrent()) {
          dispatch(removeFromFragmentDisplayList(molId));
          dispatch(removeFromQualityList(molId));
          dispatch(removeFromToBeDisplayedList({ id: data.id, type: NGL_OBJECTS.LIGAND }));
        }
        throw nativeLoadStarted ? error : markMoleculeInputError(error);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allObservations, dispatch, stage, viewerAdapter, waitForBulkRender] //skipOrientationChange and isLoadingCurrentSnapshot are not included in the dependencies by desing
  );

  const removeLigand = useCallback(
    async ligandData => {
      const data = allObservations.find(obs => obs.id === ligandData.id);
      if (!data) return 'cancelled';
      // A bulk ligand may be deselected before it starts downloading. Deletion
      // needs only its name and must still await any native load/disposal by name.
      await dispatch(
        deleteObject(
          { display_div: VIEWS.MAJOR_VIEW, name: `${generateMoleculeId(data).name}_${NGL_OBJECTS.LIGAND}` },
          stage
        )
      );
      dispatch(removeFromFragmentDisplayList(generateMoleculeId(data)));
      dispatch(removeFromQualityList(generateMoleculeId(data)));
      if (ligandData.withVector === true) {
        // remove vector
        dispatch(removeVector(stage, data));
      }

      dispatch(removeFromToBeDisplayedList({ id: ligandData.id, type: NGL_OBJECTS.LIGAND }));
      return 'removed';
    },
    [allObservations, dispatch, stage]
  );

  useEffect(() => {
    const toBeDisplayedLigands = getToBeDisplayedStructures(toBeDisplayedList, displayedLigands, NGL_OBJECTS.LIGAND);
    if (bulkLoading.current.size === 0) {
      bulkRunSettings.current = getBulkLigandSettingsForItem(
        toBeDisplayedLigands?.find(
          item => isBulkLigand(item) && allObservations.some(observation => observation.id === item.id)
        )
      );
    }
    const settings = bulkRunSettings.current || DEFAULT_BULK_LIGAND_SETTINGS;
    const limits = getBulkLigandLimits(settings);
    const toBeRemovedLigands = getToBeDisplayedStructures(
      toBeDisplayedList,
      displayedLigands,
      NGL_OBJECTS.LIGAND,
      true
    );
    toBeRemovedLigands?.forEach(data => {
      runLigandOperation(data, removeLigand);
    });

    // Only admission to Moorhen consumes native capacity. Prepared coordinates
    // retain their download-window slot until admitted, applying backpressure.
    let rendering = 0;
    let preparing = 0;
    bulkLoading.current.forEach(entry => {
      if (entry.nativeStarted) rendering++;
      else preparing++;
    });
    bulkLoading.current.forEach(entry => {
      if (entry.phase !== 'ready') return;
      if (!entry.isCurrent()) {
        entry.phase = 'cancelled';
        entry.admit(false);
        entry.admit = null;
      } else if (rendering < limits.renders) {
        entry.phase = 'rendering';
        entry.nativeStarted = true;
        rendering++;
        preparing--;
        entry.admit(true);
        entry.admit = null;
      }
    });

    toBeDisplayedLigands?.forEach(data => {
      if (!isBulkLigand(data)) {
        runLigandOperation(data, displayLigand);
        return;
      }
      if (
        getBulkLigandSettingsForItem(data) !== settings ||
        bulkLoading.current.has(data.id) ||
        bulkLoading.current.size >= limits.wholeLoad ||
        preparing >= limits.downloads ||
        !allObservations.some(observation => observation.id === data.id)
      ) {
        return;
      }

      // Claim before fetching; the existing per-item queue owns the entire
      // operation, including its wait for native admission and any later removal.
      const entry = {
        settings,
        phase: 'fetching',
        nativeStarted: false,
        isCurrent: () =>
          getViewerAdapter(VIEWS.MAJOR_VIEW) === viewerAdapter &&
          store.getState().selectionReducers.toBeDisplayedList.includes(data)
      };
      bulkLoading.current.set(data.id, entry);
      preparing++;
      const settle = () => {
        entry.phase = 'settled';
        if (!mounted.current) {
          bulkLoading.current.delete(data.id);
        } else {
          wakeBulkPipeline();
        }
      };
      runLigandOperation(data, item => displayLigand(item, entry)).then(settle, settle);
    });
    reconcileLigandActionTiming();
  }, [
    runLigandOperation,
    toBeDisplayedList,
    displayedLigands,
    displayLigand,
    dispatch,
    stage,
    removeLigand,
    allObservations,
    bulkLoadVersion,
    getViewerAdapter,
    viewerAdapter,
    store,
    wakeBulkPipeline
  ]);

  return {};
};
