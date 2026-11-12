import React from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';
import { applyMiddleware, combineReducers, legacy_createStore } from 'redux';
import { thunk } from 'redux-thunk';
import apiReducers from '../api/apiReducers';
import nglReducers from './nglReducers';
import { selectionReducers } from '../selection/selectionReducers';
import { previewReducers } from '../../components/preview/redux';
import { NglContext } from '../../components/nglView/nglProvider';
import { PoseListLHS } from '../../components/preview/molecule/poseListLHS';
import { PoseList } from '../../components/preview/molecule/poseList';
import { addLigand, removeLigand } from '../../components/preview/molecule/redux/dispatchActions';
import { setToBeDisplayedList } from '../selection/actions';
import { createSnapshotStateForSaving } from '../../components/snapshot/redux/utilitySnapshotShapes';
import { ViewerAdapter } from '../../viewer';
import { useDisplayLigandLHS } from './useDisplayLigandLHS';
import { bulkLigandPreset, getBulkLigandSettings, setBulkLigandSettings } from './bulkLigandSettings';
import { MoorhenViewerAdapter } from '../../viewer/MoorhenViewerAdapter';
import { getLigandLoadingProgress } from '../../components/preview/viewerControls/LigandLoadingProgress';
import { getLigandActionTiming } from './ligandActionTiming';

jest.mock('../../components/nglView/nglProvider', () => ({ NglContext: require('react').createContext() }));
jest.mock('../../components/preview/molecule/poseList', () => ({ PoseList: jest.fn(() => null) }));
jest.mock('../../viewer/contacts/createContactWorker', () => ({ __esModule: true, default: jest.fn() }));
// This fixture exercises the adapter's actual paint scheduler, not native mesh
// generation. Avoid evaluating the full WASM-facing package in every Jest suite.
jest.mock('moorhen', () => ({}));

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((accept, fail) => {
    resolve = accept;
    reject = fail;
  });
  return { promise, resolve, reject };
};

const createScene = (count = 12, downloads = 6, renders = 2) => {
  setBulkLigandSettings({ ...getBulkLigandSettings(), downloads, renders });
  const observations = Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    code: `observation-${index + 1}`,
    ligand_mol: `/ligand/${index + 1}`,
    tags_set: []
  }));
  const coordinates = observations.map(deferred);
  const rendering = observations.map(deferred);
  const nativeObjects = new Map();
  const reducer = combineReducers({ apiReducers, nglReducers, selectionReducers, previewReducers });
  const initialState = reducer(undefined, {});
  const store = legacy_createStore(
    reducer,
    { ...initialState, apiReducers: { ...initialState.apiReducers, all_mol_lists: observations } },
    applyMiddleware(thunk)
  );
  jest
    .spyOn(global, 'fetch')
    .mockImplementation(path =>
      coordinates[Number(path.split('/').pop()) - 1].promise.then(() => ({ text: async () => 'ligand coordinates' }))
    );
  const makeStage = () => {
    const adapter = new ViewerAdapter();
    jest.spyOn(adapter, 'loadObject').mockImplementation(async ({ target }) => {
      await rendering[target.moleculeId - 1].promise;
      const molecule = { name: target.name, buffers: [new Float32Array([1, 2, 3])] };
      const nativeRepresentation = { parentMolecule: molecule };
      molecule.representation = nativeRepresentation;
      nativeObjects.set(target.name, molecule);
      return [{ type: 'licorice', params: { visible: true }, nativeRepresentation, parentObject: molecule }];
    });
    jest.spyOn(adapter, 'removeObjects').mockImplementation(async name => {
      const molecule = nativeObjects.get(name);
      if (molecule) molecule.buffers.length = 0;
      nativeObjects.delete(name);
    });
    return adapter;
  };
  const stage = makeStage();
  let currentStage = stage;
  const context = { getNglView: () => ({ stage: currentStage }), getViewerAdapter: () => currentStage };
  const wrapper = ({ children }) => (
    <React.StrictMode>
      <Provider store={store}>
        <NglContext.Provider value={context}>
          <PoseListLHS />
          {children}
        </NglContext.Provider>
      </Provider>
    </React.StrictMode>
  );
  const hook = renderHook(() => useDisplayLigandLHS(), { wrapper });
  const replaceStage = () => {
    currentStage = makeStage();
    hook.rerender();
    return currentStage;
  };
  return { observations, coordinates, rendering, nativeObjects, stage, store, replaceStage, ...hook };
};

const startBulk = async (scene, observations = scene.observations, representations) => {
  await act(async () => {
    const { handlers } = PoseList.mock.calls[PoseList.mock.calls.length - 1][0];
    await handlers.addNewType('ligand', observations, scene.stage, true, representations);
  });
};

const advancePipeline = async () => {
  await act(async () => {
    jest.runOnlyPendingTimers();
  });
};

const fetchedPaths = () => global.fetch.mock.calls.map(([path]) => path);
const nativeIds = stage => stage.loadObject.mock.calls.map(([{ target }]) => target.moleculeId);

describe('pipelined bulk LHS ligand loading', () => {
  let originalFetch;

  // Each integration case needs isolated timers, configuration and browser spies.
  // eslint-disable-next-line jest/no-hooks
  beforeEach(() => {
    originalFetch = global.fetch;
    if (!global.fetch) global.fetch = () => {};
    jest.useFakeTimers();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'count').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    setBulkLigandSettings(bulkLigandPreset('combined'));
  });

  // eslint-disable-next-line jest/no-hooks
  afterEach(() => {
    cleanup();
    jest.useRealTimers();
    jest.restoreAllMocks();
    jest.clearAllMocks();
    global.fetch = originalFetch;
  });

  it.each([
    [6, 2],
    [4, 1],
    [8, 2]
  ])(
    'starts only %i downloads with a native limit of %i while saving all 930 intents in their normal shape',
    async (downloads, renders) => {
      expect.hasAssertions();
      const scene = createScene(930, downloads, renders);
      await startBulk(scene);
      scene.rerender();
      await act(async () => {});

      expect(fetchedPaths()).toStrictEqual(Array.from({ length: downloads }, (_, index) => `/ligand/${index + 1}`));
      expect(scene.stage.loadObject).not.toHaveBeenCalled();
      const snapshot = createSnapshotStateForSaving(scene.store.getState());
      expect(snapshot.selectionReducers.toBeDisplayedList).toHaveLength(930);
      expect(snapshot.selectionReducers.toBeDisplayedList[929]).toStrictEqual({
        type: 'LIGAND',
        id: 930,
        display: true,
        center: false,
        withQuality: true,
        rendered: false
      });
      expect(JSON.stringify(snapshot)).not.toContain('admit');
      expect(JSON.stringify(snapshot)).not.toContain('CONCURRENCY');
      expect(JSON.stringify(snapshot)).not.toMatch(/startedAt|finishedAt|ligandActionTiming/);
    }
  );

  it('downloads ahead of two native loads with bounded backpressure, refilling as loads finish out of order', async () => {
    expect.hasAssertions();
    const scene = createScene();
    await startBulk(scene);
    await act(async () => {
      scene.coordinates.slice(0, 6).forEach(item => item.resolve());
    });
    expect(scene.stage.loadObject).not.toHaveBeenCalled();
    await advancePipeline();
    expect(nativeIds(scene.stage)).toStrictEqual([1, 2]);
    expect(global.fetch).toHaveBeenCalledTimes(8);
    await act(async () => {
      scene.coordinates[6].resolve();
      scene.coordinates[7].resolve();
    });
    await advancePipeline();
    scene.rerender();
    await act(async () => {});
    expect(global.fetch).toHaveBeenCalledTimes(8);
    expect(scene.stage.loadObject).toHaveBeenCalledTimes(2);
    await act(async () => {
      scene.rendering[1].resolve();
    });
    expect(scene.stage.loadObject).toHaveBeenCalledTimes(2);
    await advancePipeline();

    expect(nativeIds(scene.stage)).toStrictEqual([1, 2, 3]);
    expect(global.fetch).toHaveBeenCalledTimes(9);
    expect(scene.store.getState().selectionReducers.toBeDisplayedList[0].rendered).not.toBe(true);
  });

  it('renders ready coordinates without waiting for a slow earlier download', async () => {
    expect.hasAssertions();
    const scene = createScene();
    await startBulk(scene);
    await act(async () => {
      scene.coordinates[1].resolve();
      scene.coordinates[2].resolve();
    });
    await advancePipeline();

    expect(nativeIds(scene.stage)).toStrictEqual([2, 3]);
  });

  it.each([
    ['serial', 1],
    ['pool', 4]
  ])('keeps a %s slot until the entire load is acknowledged', async (mode, limit) => {
    expect.hasAssertions();
    setBulkLigandSettings({ ...getBulkLigandSettings(), strategy: mode, poolSize: 4 });
    const scene = createScene(8);
    await startBulk(scene);
    expect(global.fetch).toHaveBeenCalledTimes(limit);
    await act(async () => {
      scene.coordinates.forEach(item => item.resolve());
    });
    await advancePipeline();
    expect(scene.stage.loadObject).toHaveBeenCalledTimes(limit);
    expect(global.fetch).toHaveBeenCalledTimes(limit);
    await act(async () => {
      scene.rendering[0].resolve();
    });
    expect(global.fetch).toHaveBeenCalledTimes(limit);
    await advancePipeline();
    expect(global.fetch).toHaveBeenCalledTimes(limit + 1);
    expect(scene.store.getState().selectionReducers.toBeDisplayedList[0].rendered).toBe(true);
  });

  it('holds native capacity and rendered progress through the actual coalesced repaint', async () => {
    expect.hasAssertions();
    const scene = createScene();
    const paint = {
      destroyed: false,
      pendingSceneDraw: null,
      nativeBufferPublications: new Map(),
      flushNativeBufferPublications: MoorhenViewerAdapter.prototype.flushNativeBufferPublications,
      drawSceneNow: MoorhenViewerAdapter.prototype.drawSceneNow,
      glRef: { current: { drawScene: jest.fn() } },
      flushPendingSceneDraw: MoorhenViewerAdapter.prototype.flushPendingSceneDraw
    };
    const loadNative = scene.stage.loadObject.getMockImplementation();
    scene.stage.loadObject.mockImplementation(async options => {
      const handles = await loadNative(options);
      await MoorhenViewerAdapter.prototype.requestSceneDraw.call(paint, options.coalesceDraw, options.drawMaxWaitMs);
      return handles;
    });
    const progress = () => {
      const state = scene.store.getState();
      return getLigandLoadingProgress(
        state.selectionReducers.toBeDisplayedList,
        state.apiReducers.ligandData,
        scene.observations,
        state.nglReducers.objectsInView
      );
    };
    await startBulk(scene);
    await act(async () => {
      scene.coordinates.forEach(item => item.resolve());
    });
    await advancePipeline();
    expect(nativeIds(scene.stage)).toStrictEqual([1, 2]);
    await act(async () => {
      scene.rendering[0].resolve();
      scene.rendering[1].resolve();
    });
    expect(scene.nativeObjects.size).toBe(2);
    expect(progress()).toStrictEqual({ total: 12, downloaded: 8, rendered: 0 });
    expect(paint.glRef.current.drawScene).not.toHaveBeenCalled();
    expect(scene.stage.loadObject.mock.calls.every(([options]) => options.coalesceDraw)).toBe(true);
    // The two native slots stay occupied while the frame, not geometry, is pending.
    await act(async () => {
      jest.advanceTimersByTime(16);
    });
    expect(paint.glRef.current.drawScene).toHaveBeenCalledTimes(1);
    expect(progress().rendered).toBe(2);
    await advancePipeline();
    expect(nativeIds(scene.stage)).toStrictEqual([1, 2, 3, 4]);
  });

  it('stops the bulk stopwatch only after the final shared completion repaint', async () => {
    expect.hasAssertions();
    const scene = createScene(2, 2, 2);
    const paint = {
      destroyed: false,
      pendingSceneDraw: null,
      nativeBufferPublications: new Map(),
      flushNativeBufferPublications: MoorhenViewerAdapter.prototype.flushNativeBufferPublications,
      drawSceneNow: MoorhenViewerAdapter.prototype.drawSceneNow,
      glRef: { current: { drawScene: jest.fn() } },
      flushPendingSceneDraw: MoorhenViewerAdapter.prototype.flushPendingSceneDraw
    };
    const loadNative = scene.stage.loadObject.getMockImplementation();
    scene.stage.loadObject.mockImplementation(async options => {
      const handles = await loadNative(options);
      await MoorhenViewerAdapter.prototype.requestSceneDraw.call(paint, options.coalesceDraw, options.drawMaxWaitMs);
      return handles;
    });
    await startBulk(scene);
    const startedAt = getLigandActionTiming().startedAt;
    await act(async () => {
      scene.coordinates.forEach(item => item.resolve());
    });
    await advancePipeline();
    await act(async () => {
      jest.advanceTimersByTime(1000);
      scene.rendering.forEach(item => item.resolve());
    });
    expect(scene.nativeObjects.size).toBe(2);
    expect(getLigandActionTiming().status).toBe('running');
    expect(paint.glRef.current.drawScene).not.toHaveBeenCalled();
    await act(async () => {
      jest.advanceTimersByTime(16);
    });
    expect(paint.glRef.current.drawScene).toHaveBeenCalledTimes(1);
    const timing = getLigandActionTiming();
    expect(timing.status).toBe('completed');
    expect(timing.finishedAt - startedAt).toBeGreaterThan(1000);
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    expect(getLigandActionTiming()).toBe(timing);
  });

  it('times a bulk removal through actual buffer disposal after counters have cleared', async () => {
    expect.hasAssertions();
    const scene = createScene(2, 2, 2);
    await startBulk(scene);
    await act(async () => {
      scene.coordinates.forEach(item => item.resolve());
    });
    await advancePipeline();
    await act(async () => {
      scene.rendering.forEach(item => item.resolve());
    });
    expect(getLigandActionTiming().status).toBe('completed');
    const disposal = deferred();
    const native = [...scene.nativeObjects.values()];
    scene.stage.removeObjects.mockImplementation(async name => {
      await disposal.promise;
      scene.nativeObjects.get(name).buffers.splice(0);
      scene.nativeObjects.delete(name);
    });
    await act(async () => {
      const { handlers } = PoseList.mock.calls[PoseList.mock.calls.length - 1][0];
      handlers.removeLigandsBulk(scene.stage, scene.observations);
    });
    await act(async () => {
      jest.advanceTimersByTime(250);
    });
    const state = scene.store.getState();
    expect(
      getLigandLoadingProgress(
        state.selectionReducers.toBeDisplayedList,
        state.apiReducers.ligandData,
        scene.observations,
        state.nglReducers.objectsInView
      ).total
    ).toBe(0);
    expect(getLigandActionTiming().kind).toBe('remove');
    expect(getLigandActionTiming().status).toBe('running');
    expect(native.every(object => object.buffers.length === 1)).toBe(true);
    await act(async () => {
      disposal.resolve();
    });
    expect(native.every(object => object.buffers.length === 0)).toBe(true);
    expect(scene.nativeObjects.size).toBe(0);
    expect(getLigandActionTiming().status).toBe('completed');
    expect(getLigandActionTiming().finishedAt - getLigandActionTiming().startedAt).toBe(250);
  });

  it('finishes an active strategy before starting requests with newly chosen settings', async () => {
    expect.hasAssertions();
    const scene = createScene(8, 2, 1);
    await startBulk(scene, scene.observations.slice(0, 3));
    setBulkLigandSettings(bulkLigandPreset('pool'));
    await startBulk(scene, scene.observations.slice(3));
    expect(global.fetch).toHaveBeenCalledTimes(2);
    await act(async () => {
      scene.coordinates.forEach(item => item.resolve());
    });
    await advancePipeline();
    expect(nativeIds(scene.stage)).toStrictEqual([1]);
    for (let index = 0; index < 3; index++) {
      await act(async () => {
        scene.rendering[index].resolve();
      });
      await advancePipeline();
      await advancePipeline();
    }
    expect(nativeIds(scene.stage)).toStrictEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(scene.stage.loadObject.mock.calls.slice(0, 3).every(([options]) => options.coalesceDraw)).toBe(true);
    expect(scene.stage.loadObject.mock.calls.slice(3).every(([options]) => !options.coalesceDraw)).toBe(true);
    expect(fetchedPaths()).not.toContain('/ligand/8');
  });

  it('restores unrestricted publication and loading when the original preset is selected', async () => {
    expect.hasAssertions();
    setBulkLigandSettings(bulkLigandPreset('original'));
    const scene = createScene(12);
    const changes = jest.fn();
    scene.store.subscribe(changes);
    await startBulk(scene);
    expect(changes).toHaveBeenCalledTimes(36);
    expect(global.fetch).toHaveBeenCalledTimes(12);
    await act(async () => {
      scene.coordinates.forEach(item => item.resolve());
    });
    expect(scene.stage.loadObject).toHaveBeenCalledTimes(12);
    expect(scene.stage.loadObject.mock.calls.every(([options]) => !options.coalesceDraw)).toBe(true);
    await act(async () => {
      scene.rendering.forEach(item => item.resolve());
    });
    expect(scene.store.getState().selectionReducers.toBeDisplayedList.every(item => item.rendered)).toBe(true);
  });

  it('captures native experiments per bulk request and excludes them from single toggles and snapshots', async () => {
    expect.hasAssertions();
    setBulkLigandSettings(bulkLigandPreset('native'));
    const scene = createScene(3);
    await startBulk(scene, scene.observations.slice(0, 2));
    setBulkLigandSettings(bulkLigandPreset('combined'));
    await act(async () => {
      await scene.store.dispatch(addLigand(scene.stage, scene.observations[2]));
      scene.coordinates.forEach(item => item.resolve());
    });
    await advancePipeline();
    const requests = scene.stage.loadObject.mock.calls.map(([options]) => options);
    expect(requests.find(options => options.target.moleculeId === 3).bulkLigandOptions).toBeUndefined();
    expect(
      requests
        .filter(options => options.target.moleculeId !== 3)
        .every(
          options =>
            options.bulkLigandOptions.reduceNativeUpdates &&
            options.bulkLigandOptions.lowDetail &&
            options.bulkLigandOptions.batchNativeBuffers &&
            options.bulkLigandOptions.batchCootCommands
        )
    ).toBe(true);
    expect(JSON.stringify(createSnapshotStateForSaving(scene.store.getState()))).not.toMatch(
      /bulkLigandOptions|reduceNativeUpdates|batchNativeBuffers|batchCootCommands|lowDetail|deferModelsUI/
    );
    await act(async () => {
      scene.rendering.forEach(item => item.resolve());
    });
  });

  it('drains the pipeline with saved appearance and keeps circular native resources out of Redux', async () => {
    expect.hasAssertions();
    const scene = createScene(9, 3, 2);
    const representations = [{ type: 'licorice', params: { opacity: 0.6 } }];
    await startBulk(scene, scene.observations, representations);
    await act(async () => {
      scene.coordinates.forEach(item => item.resolve());
    });
    await advancePipeline();
    for (let index = 0; index < 9; index++) {
      expect(nativeIds(scene.stage)).toContain(index + 1);
      await act(async () => {
        scene.rendering[index].resolve();
      });
      await advancePipeline();
      await advancePipeline();
    }

    expect(scene.stage.loadObject).toHaveBeenCalledTimes(9);
    expect(scene.stage.loadObject).toHaveBeenLastCalledWith(
      expect.objectContaining({ representations, center: false, loadQuality: false })
    );
    expect(scene.store.getState().selectionReducers.toBeDisplayedList.every(item => item.rendered)).toBe(true);
    expect(scene.store.getState().nglReducers.countOfPendingNglObjects.major_view).toBe(0);
    expect(scene.nativeObjects.size).toBe(9);
    expect(JSON.stringify(scene.store.getState())).not.toContain('parentMolecule');
  });

  it('keeps individual and transfer requests outside both bulk limits', async () => {
    expect.hasAssertions();
    const scene = createScene(6, 4, 1);
    await startBulk(scene, scene.observations.slice(0, 4));
    await act(async () => {
      await scene.store.dispatch(addLigand(scene.stage, scene.observations[4]));
      await scene.store.dispatch(addLigand(scene.stage, scene.observations[5]));
      scene.coordinates[4].resolve();
      scene.coordinates[5].resolve();
      scene.coordinates[0].resolve();
    });
    await advancePipeline();

    expect(nativeIds(scene.stage)).toStrictEqual([5, 6, 1]);
    expect(global.fetch).toHaveBeenCalledTimes(6);
  });

  it('shares preparation slots across overlapping bulk requests and duplicate intents', async () => {
    expect.hasAssertions();
    const scene = createScene(6, 2, 1);
    await startBulk(scene, scene.observations.slice(0, 3));
    await startBulk(scene);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    await act(async () => {
      scene.coordinates[0].resolve();
    });
    await advancePipeline();

    expect(fetchedPaths()).toStrictEqual(['/ligand/1', '/ligand/2', '/ligand/3']);
    expect(nativeIds(scene.stage)).toStrictEqual([1]);
  });

  it.each(['fetching', 'ready'])(
    'cancels %s preparation and unstarted work without rendering or extra deletion fetches',
    async phase => {
      expect.hasAssertions();
      const scene = createScene(6, 3, 1);
      await startBulk(scene);
      if (phase === 'ready') {
        await act(async () => {
          scene.coordinates.slice(0, 3).forEach(item => item.resolve());
        });
        await advancePipeline();
      }
      await act(async () => {
        scene.store.dispatch(removeLigand(scene.stage, scene.observations[2]));
        scene.store.dispatch(removeLigand(scene.stage, scene.observations[5]));
        scene.coordinates[2].resolve();
      });
      await advancePipeline();
      await advancePipeline();

      expect(nativeIds(scene.stage)).not.toContain(3);
      expect(fetchedPaths().filter(path => path === '/ligand/3')).toHaveLength(1);
      expect(fetchedPaths()).not.toContain('/ligand/6');
      expect(scene.stage.removeObjects).toHaveBeenCalledWith('observation-3_LIGAND');
      expect(scene.stage.removeObjects).toHaveBeenCalledWith('observation-6_LIGAND');
      expect(scene.store.getState().selectionReducers.toBeDisplayedList.map(item => item.id)).not.toContain(3);
      expect(scene.store.getState().selectionReducers.toBeDisplayedList.map(item => item.id)).not.toContain(6);
    }
  );

  it('orders removal after active native loading and waits for actual buffer disposal before acknowledging it', async () => {
    expect.hasAssertions();
    const scene = createScene(3, 2, 1);
    await startBulk(scene);
    await act(async () => {
      scene.coordinates[0].resolve();
    });
    await advancePipeline();
    const deletion = deferred();
    scene.stage.removeObjects.mockImplementation(async name => {
      await deletion.promise;
      const molecule = scene.nativeObjects.get(name);
      if (molecule) molecule.buffers.length = 0;
      scene.nativeObjects.delete(name);
    });
    await act(async () => {
      scene.store.dispatch(removeLigand(scene.stage, scene.observations[0]));
    });
    expect(scene.stage.removeObjects).not.toHaveBeenCalled();
    await act(async () => {
      scene.rendering[0].resolve();
    });
    const nativeObject = scene.nativeObjects.get('observation-1_LIGAND');
    expect(nativeObject.buffers).toHaveLength(1);
    expect(scene.store.getState().selectionReducers.fragmentDisplayList).toContain(1);
    expect(scene.store.getState().nglReducers.objectsInView).toHaveProperty('observation-1_LIGAND');
    await act(async () => {
      deletion.resolve();
    });

    expect(nativeObject.buffers).toStrictEqual([]);
    expect(scene.nativeObjects.size).toBe(0);
    expect(scene.store.getState().selectionReducers.fragmentDisplayList).toStrictEqual([]);
    expect(scene.store.getState().nglReducers.objectsInView).toStrictEqual({});
    expect(scene.store.getState().selectionReducers.toBeDisplayedList.map(item => item.id)).toStrictEqual([2, 3]);
  });

  it.each(['coordinates', 'rendering'])(
    'releases capacity after a failed %s operation and continues loading',
    async phase => {
      expect.hasAssertions();
      const scene = createScene(5, 2, 1);
      await startBulk(scene);
      if (phase === 'rendering') {
        await act(async () => {
          scene.coordinates[0].resolve();
        });
        await advancePipeline();
      }
      await act(async () => {
        scene[phase][0].reject(new Error(`failed ${phase}`));
      });
      await advancePipeline();
      expect(scene.store.getState().selectionReducers.toBeDisplayedList.map(item => item.id)).toStrictEqual([
        2,
        3,
        4,
        5
      ]);
      expect(scene.store.getState().nglReducers.countOfPendingNglObjects.major_view).toBe(0);
      expect(getLigandActionTiming().status).toBe('running');
      expect(fetchedPaths()).toStrictEqual(['/ligand/1', '/ligand/2', '/ligand/3']);
      await act(async () => {
        scene.coordinates[1].resolve();
      });
      await advancePipeline();

      expect(nativeIds(scene.stage)).toContain(2);
      for (let index = 1; index < scene.observations.length; index++) {
        await act(async () => scene.coordinates[index].resolve());
        await advancePipeline();
        await act(async () => scene.rendering[index].resolve());
        await advancePipeline();
      }
      expect(getLigandActionTiming()).toMatchObject({
        status: phase === 'coordinates' ? 'completed' : 'failed',
        skippedCount: phase === 'coordinates' ? 1 : 0
      });
    }
  );

  it('does not let an obsolete coordinate failure remove a replacement snapshot intent', async () => {
    expect.hasAssertions();
    const scene = createScene(3, 2, 1);
    const failedRequest = deferred();
    global.fetch.mockImplementationOnce(() => failedRequest.promise);
    await startBulk(scene);
    const representations = [{ type: 'line', params: { opacity: 0.4 } }];
    await act(async () => {
      scene.store.dispatch(setToBeDisplayedList([{ id: 1, type: 'LIGAND', display: true, representations }]));
      failedRequest.reject(new Error('obsolete coordinates'));
    });
    await advancePipeline();
    expect(scene.store.getState().selectionReducers.toBeDisplayedList).toHaveLength(1);
    await act(async () => {
      scene.coordinates[0].resolve();
    });

    expect(scene.stage.loadObject).toHaveBeenCalledTimes(1);
    expect(scene.stage.loadObject).toHaveBeenCalledWith(expect.objectContaining({ representations }));
  });

  it('supersedes prepared and waiting intents before they can create obsolete native objects', async () => {
    expect.hasAssertions();
    const scene = createScene(9, 3, 1);
    await startBulk(scene);
    await act(async () => {
      scene.coordinates.slice(0, 3).forEach(item => item.resolve());
    });
    await act(async () => {
      scene.store.dispatch(setToBeDisplayedList([{ id: 7, type: 'LIGAND', display: true }]));
    });
    await advancePipeline();
    expect(fetchedPaths()).toStrictEqual(['/ligand/1', '/ligand/2', '/ligand/3', '/ligand/7']);
    expect(scene.stage.loadObject).not.toHaveBeenCalled();
    await act(async () => {
      scene.coordinates[6].resolve();
      scene.rendering[6].resolve();
    });

    expect(nativeIds(scene.stage)).toStrictEqual([7]);
    expect(scene.nativeObjects.size).toBe(1);
  });

  it('retries cloned snapshot intents through normal scheduling with their latest appearance and cached coordinates', async () => {
    expect.hasAssertions();
    const scene = createScene(6, 3, 1);
    await startBulk(scene);
    await act(async () => {
      scene.coordinates.slice(0, 3).forEach(item => item.resolve());
    });
    await advancePipeline();
    expect(nativeIds(scene.stage)).toStrictEqual([1]);
    const snapshot = createSnapshotStateForSaving(scene.store.getState());
    const representations = [{ type: 'line', params: { opacity: 0.4 } }];
    snapshot.selectionReducers.toBeDisplayedList[1].representations = representations;
    await act(async () => {
      scene.store.dispatch(setToBeDisplayedList(snapshot.selectionReducers.toBeDisplayedList));
    });
    await advancePipeline();

    expect(nativeIds(scene.stage)).toStrictEqual([1, 2, 3]);
    expect(scene.stage.loadObject.mock.calls[1][0].representations).toStrictEqual(representations);
    expect(fetchedPaths().filter(path => path === '/ligand/2')).toHaveLength(1);
    expect(fetchedPaths().filter(path => path === '/ligand/3')).toHaveLength(1);
  });

  it('does not admit prepared coordinates to a replaced viewer runtime', async () => {
    expect.hasAssertions();
    const scene = createScene(2, 2, 1);
    await startBulk(scene);
    await act(async () => {
      scene.coordinates[0].resolve();
    });
    let replacement;
    await act(async () => {
      replacement = scene.replaceStage();
    });
    await advancePipeline();
    await advancePipeline();

    expect(scene.stage.loadObject).not.toHaveBeenCalled();
    expect(nativeIds(replacement)).toStrictEqual([1]);
    expect(fetchedPaths().filter(path => path === '/ligand/1')).toHaveLength(1);
  });

  it.each(['fetching', 'ready', 'rendering', 'yielding'])(
    'stops further admissions when unmounted during %s',
    async phase => {
      expect.hasAssertions();
      const scene = createScene(6, 3, 1);
      await startBulk(scene);
      if (phase !== 'fetching') {
        await act(async () => {
          scene.coordinates.slice(0, 3).forEach(item => item.resolve());
        });
      }
      if (phase === 'rendering' || phase === 'yielding') await advancePipeline();
      if (phase === 'yielding') {
        await act(async () => {
          scene.rendering[0].resolve();
        });
      }
      const started = global.fetch.mock.calls.length;
      scene.unmount();
      expect(getLigandActionTiming().status).toBe('cancelled');
      await act(async () => {
        scene.coordinates.forEach(item => item.resolve());
        scene.rendering.forEach(item => item.resolve());
      });
      await advancePipeline();

      expect(global.fetch).toHaveBeenCalledTimes(started);
      expect(scene.stage.loadObject).toHaveBeenCalledTimes(phase === 'rendering' || phase === 'yielding' ? 1 : 0);
      // React act leaves a fake queueMicrotask job; flush it before checking timers.
      jest.runAllTicks();
      expect(jest.getTimerCount()).toBe(0);
    }
  );
});
