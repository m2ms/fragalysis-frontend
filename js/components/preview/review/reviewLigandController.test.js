import React from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { applyMiddleware, combineReducers, legacy_createStore } from 'redux';
import { thunk } from 'redux-thunk';
import { ThemeProvider } from '../../../ui/styles';
import { getTheme } from '../../../theme';
import { VIEWS } from '../../../constants/constants';
import { selectionReducers } from '../../../reducers/selection/selectionReducers';
import nglReducers from '../../../reducers/ngl/nglReducers';
import { datasetsReducers } from '../../datasets/redux/reducer';
import { appendToBeDisplayedListForDataset } from '../../datasets/redux/actions';
import { setRHSSelectedTags } from '../../../reducers/selection/actions';
import { molecule } from '../molecule/redux/reducer';
import { addLigand, removeLigand } from '../molecule/redux/dispatchActions';
import { centerOnLigandByMoleculeID } from '../../../reducers/ngl/dispatchActions';
import { NglContext } from '../../nglView/nglProvider';
import { OBJECT_TYPE } from '../../nglView/constants';
import { ViewerAdapter } from '../../../viewer/ViewerAdapter';
import { generateMoleculeObject } from '../../nglView/generatingObjects';
import { useDisplayLigandLHS } from '../../../reducers/ngl/useDisplayLigandLHS';
import { useDisplayLigandRHS } from '../../../reducers/ngl/useDisplayLigandRHS';
import { selectActiveRhsObservationIds } from './rhsReviewRetention';
import { createReviewLigandController } from './reviewLigandController';
import { ReviewLigandProvider } from './ReviewLigandProvider';
import { RhsReviewPanel } from './RhsReviewPanel';
import { ToastContext } from '../../toast';

jest.mock('../../../utils/djangoContext', () => ({ DJANGO_CONTEXT: { pk: 7 } }));
jest.mock('../../rdkit/RDKitContext', () => ({ useRDKit: () => ({ RDKitModule: null, loading: false }) }));
jest.mock('../../../viewer/qualityInformation', () => ({ readQualityInformation: () => () => null }));
jest.mock('../../nglView/generatingObjects', () => ({
  ...jest.requireActual('../../nglView/generatingObjects'),
  generateMoleculeObject: jest.fn()
}));

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((accept, fail) => {
    resolve = accept;
    reject = fail;
  });
  return { promise, resolve, reject };
};
const observations = [1, 2, 3].map(id => ({ id, code: `v${id}`, virtual_name: `v${id}`, cmpd: id, tags_set: [] }));
const targetFor = (data, datasetID) => ({
  name: `${data.code}_LIGAND${datasetID === undefined ? '' : `_${datasetID}`}`,
  moleculeId: data.id,
  OBJECT_TYPE: OBJECT_TYPE.LIGAND,
  sdf_info: 'coordinates'
});

class NativeRuntime extends ViewerAdapter {
  constructor() {
    super();
    this.resources = new Map();
    this.loads = [];
    this.removals = [];
    this.loadGates = new Map();
    this.removeGates = new Map();
  }
  async loadObject(options) {
    this.loads.push(options);
    await this.loadGates.get(options.target.name)?.promise;
    const native = { buffers: new Uint8Array(512), name: options.target.name };
    native.self = native;
    this.resources.set(native.name, native);
    return (options.representations || [{ type: 'licorice', params: { radiusSize: 0.11 } }]).map((repr, index) => ({
      ...repr,
      uuid: `${native.name}-${index}`,
      visible: repr.params?.visible !== false,
      nativeRepresentation: native,
      parentObject: native,
      ready: Promise.resolve(native)
    }));
  }
  async removeObjects(name) {
    this.removals.push(name);
    await this.removeGates.get(name)?.promise;
    this.resources.delete(name);
  }
}

const setup = (panel = false, options = {}) => {
  generateMoleculeObject.mockReset();
  generateMoleculeObject.mockImplementation((data, _color, datasetID) => async () => targetFor(data, datasetID));
  const api = {
    target_on: 1,
    all_mol_lists: observations.slice(0, 2),
    rhs_compounds_list: [],
    tagList: [],
    categoryList: [],
    noTagsReceived: true,
    rhsDataIsLoaded: true,
    ...options.api
  };
  const reducer = combineReducers({
    selectionReducers,
    nglReducers,
    datasetsReducers,
    previewReducers: combineReducers({ molecule }),
    apiReducers: (state = api, action) => (action.type === 'TEST_TARGET' ? { ...state, target_on: action.id } : state)
  });
  const initial = reducer(undefined, {});
  initial.selectionReducers = {
    ...initial.selectionReducers,
    rhs_displayAllMolecules: true,
    moleculeAllSelection: [2],
    proteinList: [99],
    vectorOnList: [99]
  };
  initial.datasetsReducers = {
    ...initial.datasetsReducers,
    moleculeLists: options.moleculeLists || { 10: [1, '2'], 20: [observations[2]] }
  };
  initial.previewReducers.molecule.imageCache = { 1: '<svg />', 2: '<svg />', 3: '<svg />' };
  const store = legacy_createStore(reducer, initial, applyMiddleware(thunk));
  const runtime = new NativeRuntime();
  jest.spyOn(runtime, 'getOrientation').mockImplementation(() => null);
  jest.spyOn(runtime, 'setOrientation').mockImplementation(() => null);
  jest.spyOn(runtime, 'centerOn').mockImplementation(() => null);
  jest.spyOn(runtime, 'getObject').mockImplementation(name => runtime.resources.get(name));
  const context = { getNglView: () => ({ stage: runtime }), getViewerAdapter: () => runtime };
  const controller = createReviewLigandController({
    store,
    getViewer: () => runtime,
    timeout: 1000,
    ...options.controller
  });
  const stop = controller.start();
  const wrapper = ({ children }) => (
    <React.StrictMode>
      <Provider store={store}>
        <NglContext.Provider value={context}>
          <ThemeProvider theme={getTheme()}>
            <ToastContext.Provider value={{ toastInfo: jest.fn() }}>{children}</ToastContext.Provider>
          </ThemeProvider>
        </NglContext.Provider>
      </Provider>
    </React.StrictMode>
  );
  const Hooks = () => {
    useDisplayLigandLHS();
    useDisplayLigandRHS();
    return null;
  };
  const Panel = ({ open = true }) => (
    <ReviewLigandProvider>
      <Hooks />
      {open && <RhsReviewPanel />}
    </ReviewLigandProvider>
  );
  const view = panel
    ? render(<Panel />, { wrapper })
    : renderHook(
        () => {
          useDisplayLigandLHS();
          useDisplayLigandRHS();
        },
        { wrapper }
      );
  return {
    store,
    runtime,
    controller,
    view,
    setPanelVisible: open => view.rerender(<Panel open={open} />),
    finish: () => {
      view.unmount();
      stop();
    }
  };
};
const run = async (controller, id) => {
  await act(async () => {
    await controller.toggle(id);
  });
};

const inspirations = [11, 12, 13].map(id => ({ id, code: `x${id}`, cmpd: id, tags_set: [] }));
const groupOptions = {
  api: {
    all_mol_lists: [
      { ...observations[0], computed_inspirations: [11, 12, 999] },
      { ...observations[1], computed_inspirations: [11, 13] },
      ...inspirations
    ]
  }
};

describe('review ligand rendering through the application queues', () => {
  it('keeps pending and active group ownership across closing/reopening and exposes partial blue cards as restore actions', async () => {
    expect.hasAssertions();
    const observer = global.ResizeObserver;
    global.ResizeObserver = class {
      observe() {}
      disconnect() {}
    };
    const bounds = jest
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValue({ width: 1000, height: 420 });
    const test = setup(true, groupOptions);
    const gate = deferred();

    test.runtime.loadGates.set('x11_LIGAND', gate);

    try {
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Show ligand for v1' }));
      });
      expect(screen.getByRole('progressbar', { name: 'Updating ligand for v1' })).toBeInTheDocument();
      await act(async () => {
        test.setPanelVisible(false);
      });
      await act(async () => {
        gate.resolve();
      });
      expect(test.runtime.resources.size).toBe(3);
      await act(async () => {
        test.setPanelVisible(true);
      });
      expect(screen.getByRole('button', { name: 'Hide ligand for v1' })).toHaveAttribute('aria-pressed', 'true');
      await act(async () => {
        test.store.dispatch(removeLigand(test.runtime, inspirations[0], true, false));
      });
      expect(screen.getByRole('button', { name: 'Show ligand for v1' })).toHaveAttribute('aria-pressed', 'true');
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Show ligand for v1' }));
      });
      expect(test.runtime.resources.size).toBe(3);
      expect(test.runtime.loads.filter(load => load.target.name === 'v1_LIGAND')).toHaveLength(1);
      await act(async () => {
        test.setPanelVisible(false);

        test.setPanelVisible(true);
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Hide ligand for v1' }));
      });
      expect(test.runtime.resources.size).toBe(0);
      expect(test.store.getState().selectionReducers.moleculeAllSelection).toStrictEqual([2]);
    } finally {
      test.finish();

      bounds.mockRestore();
      global.ResizeObserver = observer;
    }
  });

  it('releases a dataset-only design and its acquired inspiration while retaining an independently loaded dataset copy', async () => {
    expect.hasAssertions();
    const test = setup(false, {
      ...groupOptions,
      moleculeLists: { 10: [1, '2', 11], 20: [{ ...observations[2], computed_inspirations: [11] }] }
    });
    try {
      await run(test.controller, 3);
      expect([...test.runtime.resources.keys()].sort()).toStrictEqual(['v3_LIGAND_20', 'x11_LIGAND']);
      await act(async () => {
        test.store.dispatch(
          appendToBeDisplayedListForDataset('10', {
            id: 11,
            datasetID: '10',
            type: 'LIGAND',
            display: true,
            center: false
          })
        );
      });
      await run(test.controller, 3);
      expect([...test.runtime.resources.keys()]).toStrictEqual(['x11_LIGAND_10']);
      expect(test.store.getState().datasetsReducers.ligandLists['20']).toStrictEqual([]);
    } finally {
      test.finish();
    }
  });

  it('retains responsibility after failed rollback disposal, preserves independent ligands, and cleans up on retry', async () => {
    expect.hasAssertions();
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    const test = setup(false, groupOptions);
    try {
      await act(async () => {
        test.store.dispatch(addLigand(test.runtime, inspirations[0], undefined, false));
      });

      test.runtime.loadGates.set('x12_LIGAND', { promise: Promise.reject(new Error('inspiration unavailable')) });

      const remove = test.runtime.removeObjects.bind(test.runtime);
      jest.spyOn(test.runtime, 'removeObjects').mockRejectedValueOnce(new Error('rollback disposal failed'));
      await run(test.controller, 1);
      expect(test.controller.getSnapshot()['1'].error).toBe(
        'inspiration unavailable Cleanup also failed; click to retry.'
      );
      expect([...test.runtime.resources.keys()].sort()).toStrictEqual(['v1_LIGAND', 'x11_LIGAND']);

      test.runtime.removeObjects.mockImplementation(remove);

      test.runtime.loadGates.clear();

      await run(test.controller, 1);
      expect(test.runtime.resources.size).toBe(3);
      await run(test.controller, 1);
      expect([...test.runtime.resources.keys()]).toStrictEqual(['x11_LIGAND']);
    } finally {
      test.finish();

      log.mockRestore();
    }
  });

  it('loads shared inspiration groups once, releases only the last owner, and preserves camera and other controls', async () => {
    expect.hasAssertions();
    const test = setup(false, groupOptions);
    const gate = deferred();

    test.runtime.loadGates.set('x11_LIGAND', gate);

    const before = test.store.getState().selectionReducers;
    try {
      let first;
      let second;
      await act(async () => {
        first = test.controller.toggle(1);
        second = test.controller.toggle(2);
      });
      expect(test.runtime.loads.filter(load => load.target.name === 'x11_LIGAND')).toHaveLength(1);
      expect(test.runtime.resources.has('v1_LIGAND')).toBe(true);
      expect(test.runtime.resources.has('v2_LIGAND')).toBe(true);
      expect(test.controller.getSnapshot()['1'].pending).toBe(true);
      expect(test.controller.getSnapshot()['2'].pending).toBe(true);
      await act(async () => {
        gate.resolve();
        await Promise.all([first, second]);
      });
      expect(test.runtime.resources.size).toBe(5);
      expect(test.controller.getSnapshot()['1'].error).toBeNull();
      await run(test.controller, 1);
      expect([...test.runtime.resources.keys()].sort()).toStrictEqual(['v2_LIGAND', 'x11_LIGAND', 'x13_LIGAND']);
      await run(test.controller, 2);
      expect(test.runtime.resources.size).toBe(0);
      expect(test.store.getState().selectionReducers.moleculeAllSelection).toBe(before.moleculeAllSelection);
      expect(test.store.getState().selectionReducers.proteinList).toBe(before.proteinList);
      expect(test.store.getState().selectionReducers.vectorOnList).toBe(before.vectorOnList);
      expect(test.runtime.loads.every(load => !load.center)).toBe(true);
      expect(test.runtime.centerOn).not.toHaveBeenCalled();
      expect(test.runtime.getOrientation).not.toHaveBeenCalled();
      expect(() => JSON.stringify(test.store.getState())).not.toThrow();
    } finally {
      test.finish();
    }
  });

  it.each(['before', 'during', 'pending'])(
    'preserves an independently added inspiration %s group activation',
    async when => {
      expect.hasAssertions();
      const test = setup(false, groupOptions);
      const gate = deferred();
      try {
        if (when === 'before')
          await act(async () => {
            await test.store.dispatch(addLigand(test.runtime, inspirations[0], undefined, false));
          });
        if (when === 'pending') test.runtime.loadGates.set('x11_LIGAND', gate);
        let completion;
        await act(async () => {
          completion = test.controller.toggle(1);
        });
        if (when !== 'before')
          await act(async () => {
            await test.store.dispatch(addLigand(test.runtime, inspirations[0], undefined, false));
          });
        await act(async () => {
          gate.resolve();
          await completion;
        });
        await run(test.controller, 1);
        expect([...test.runtime.resources.keys()]).toStrictEqual(['x11_LIGAND']);
        expect(test.runtime.loads.filter(load => load.target.name === 'x11_LIGAND')).toHaveLength(1);
        expect(
          test.store.getState().selectionReducers.toBeDisplayedList.some(item => item.id === 11 && item.display)
        ).toBe(true);
      } finally {
        test.finish();
      }
    }
  );

  it('restores a missing inspiration on a blue card and then releases the complete group', async () => {
    expect.hasAssertions();
    const test = setup(false, groupOptions);
    try {
      await run(test.controller, 1);
      await act(async () => {
        test.store.dispatch(removeLigand(test.runtime, inspirations[0], true, false));
      });
      expect(test.runtime.resources.has('x11_LIGAND')).toBe(false);
      expect(selectActiveRhsObservationIds(test.store.getState())).toContain('1');
      await run(test.controller, 1);
      expect([...test.runtime.resources.keys()].sort()).toStrictEqual(['v1_LIGAND', 'x11_LIGAND', 'x12_LIGAND']);
      expect(test.runtime.loads.filter(load => load.target.name === 'v1_LIGAND')).toHaveLength(1);
      await run(test.controller, 1);
      expect(test.runtime.resources.size).toBe(0);
    } finally {
      test.finish();
    }
  });

  it('uses the current tag resolver but retains cleanup responsibility for inspirations acquired under old tags', async () => {
    expect.hasAssertions();
    const options = {
      api: {
        all_mol_lists: [
          { ...observations[0], computed_inspirations: [11, 12], computed_inspirations_by_set: { 10: [11], 20: [12] } },
          observations[1],
          ...inspirations
        ]
      }
    };
    const test = setup(false, options);
    try {
      await act(async () => {
        test.store.dispatch(setRHSSelectedTags([{ id: 'rhs-10' }]));
      });
      await run(test.controller, 1);
      expect([...test.runtime.resources.keys()].sort()).toStrictEqual(['v1_LIGAND', 'x11_LIGAND']);
      await act(async () => {
        test.store.dispatch(setRHSSelectedTags([{ id: 'custom', additional_info: { computed_set: 20 } }]));
      });
      await run(test.controller, 1);
      expect(test.runtime.resources.size).toBe(3);
      await run(test.controller, 1);
      expect(test.runtime.resources.size).toBe(0);
    } finally {
      test.finish();
    }
  });

  it('waits for shared removal before reacquiring and keeps the new owner after native deletion', async () => {
    expect.hasAssertions();
    const test = setup(false, groupOptions);
    const deletion = deferred();
    try {
      await run(test.controller, 1);

      test.runtime.removeGates.set('x11_LIGAND', deletion);

      let removing;
      let adding;
      await act(async () => {
        removing = test.controller.toggle(1);
      });
      await act(async () => {
        adding = test.controller.toggle(2);
      });
      expect(test.runtime.loads.filter(load => load.target.name === 'x11_LIGAND')).toHaveLength(1);
      expect(test.runtime.resources.has('v2_LIGAND')).toBe(true);
      await act(async () => {
        deletion.resolve();
        await Promise.all([removing, adding]);
      });
      expect(test.runtime.loads.filter(load => load.target.name === 'x11_LIGAND')).toHaveLength(2);
      expect([...test.runtime.resources.keys()].sort()).toStrictEqual(['v2_LIGAND', 'x11_LIGAND', 'x13_LIGAND']);
      await run(test.controller, 2);
      expect(test.runtime.resources.size).toBe(0);
    } finally {
      test.finish();
    }
  });

  it('rolls back failed partial additions while preserving shared and independent resources and permits retry', async () => {
    expect.hasAssertions();
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    const test = setup(false, groupOptions);
    try {
      await run(test.controller, 2);

      test.runtime.loadGates.set('x12_LIGAND', { promise: Promise.reject(new Error('inspiration unavailable')) });

      await run(test.controller, 1);
      expect(test.controller.getSnapshot()['1']).toStrictEqual({ pending: false, error: 'inspiration unavailable' });
      expect([...test.runtime.resources.keys()].sort()).toStrictEqual(['v2_LIGAND', 'x11_LIGAND', 'x13_LIGAND']);

      test.runtime.loadGates.clear();

      await run(test.controller, 1);
      expect(test.runtime.resources.size).toBe(5);
      await run(test.controller, 1);
      await run(test.controller, 2);
      expect(test.runtime.resources.size).toBe(0);
    } finally {
      test.finish();

      log.mockRestore();
    }
  });

  it('retains failed cleanup responsibility and retries release without loading new resources', async () => {
    expect.hasAssertions();
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    const test = setup(false, groupOptions);
    try {
      await run(test.controller, 1);
      const remove = test.runtime.removeObjects.bind(test.runtime);
      jest.spyOn(test.runtime, 'removeObjects').mockImplementation(async name => {
        if (name === 'x11_LIGAND') throw new Error('shared disposal failed');
        return remove(name);
      });
      await run(test.controller, 1);
      expect(test.controller.getSnapshot()['1'].error).toBe('shared disposal failed');
      expect([...test.runtime.resources.keys()]).toStrictEqual(['x11_LIGAND']);

      test.runtime.removeObjects.mockImplementation(remove);

      const loadCount = test.runtime.loads.length;
      await run(test.controller, 1);
      expect(test.runtime.resources.size).toBe(0);
      expect(test.runtime.loads).toHaveLength(loadCount);
    } finally {
      test.finish();

      log.mockRestore();
    }
  });

  it('cancels an in-flight old-target group without scheduling cleanup into the new target', async () => {
    expect.hasAssertions();
    const test = setup(false, groupOptions);
    const gate = deferred();

    test.runtime.loadGates.set('x11_LIGAND', gate);

    try {
      let completion;
      await act(async () => {
        completion = test.controller.toggle(1);
      });
      await act(async () => {
        test.store.dispatch({ type: 'TEST_TARGET', id: 2 });

        await completion;
      });
      expect(test.controller.getSnapshot()).toStrictEqual({});
      expect(test.runtime.removals).toHaveLength(0);
      await act(async () => {
        gate.resolve();
      });
      expect(test.runtime.removals).toHaveLength(0);
    } finally {
      test.finish();
    }
  });

  it.each([1, 3])(
    'centers observation %s from its card with navigator behavior, preserving visibility and bulk selection',
    async id => {
      expect.hasAssertions();
      const observer = global.ResizeObserver;
      global.ResizeObserver = class {
        observe() {}
        disconnect() {}
      };
      const bounds = jest
        .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
        .mockReturnValue({ width: 1000, height: 420 });
      const test = setup(true);
      const centering = deferred();
      const orientation = { elements: [0, 0, 0, 1, -4, 2, 0, 0.5] };
      try {
        expect(screen.getByRole('button', { name: `Center on ligand for v${id}` })).toBeDisabled();
        await run(test.controller, id);
        const button = screen.getByRole('button', { name: `Center on ligand for v${id}` });
        expect(button).toBeEnabled();
        const before = test.store.getState();
        const loadCount = test.runtime.loads.length;

        test.runtime.centerOn.mockImplementationOnce(() => centering.promise);

        test.runtime.getOrientation.mockReturnValue(orientation);

        await act(async () => {
          fireEvent.click(button);
        });
        const name = id === 3 ? 'v3_LIGAND_20' : 'v1_LIGAND';
        expect(test.runtime.centerOn).toHaveBeenCalledWith(test.runtime.resources.get(name));
        expect(test.runtime.getOrientation).not.toHaveBeenCalled();
        await act(async () => {
          centering.resolve();
        });
        expect(test.store.getState().nglReducers.nglOrientations[VIEWS.MAJOR_VIEW]).toStrictEqual(orientation);
        expect(test.runtime.loads).toHaveLength(loadCount);
        expect(test.store.getState().selectionReducers).toBe(before.selectionReducers);
        expect(test.store.getState().datasetsReducers).toBe(before.datasetsReducers);
        expect(screen.getByRole('button', { name: `Hide ligand for v${id}` })).toHaveAttribute('aria-pressed', 'true');
        // The existing navigator call still resolves and focuses the same native component.
        await act(async () => {
          await test.store.dispatch(centerOnLigandByMoleculeID(test.runtime, id, id === 3 ? '20' : null));
        });
        expect(test.runtime.centerOn).toHaveBeenLastCalledWith(test.runtime.resources.get(name));
        expect(test.runtime.centerOn).toHaveBeenCalledTimes(2);
      } finally {
        test.finish();

        bounds.mockRestore();
        global.ResizeObserver = observer;
      }
    }
  );

  it('claims rapid requests once, waits for coordinates/rendering/disposal, and keeps other ligands and controls', async () => {
    expect.hasAssertions();
    const test = setup();
    const { store, controller, runtime } = test;
    const coordinates = deferred();
    const rendering = deferred();
    const deletion = deferred();
    runtime.loadGates.set('v1_LIGAND', rendering);
    runtime.removeGates.set('v1_LIGAND', deletion);
    generateMoleculeObject.mockImplementationOnce(() => () => coordinates.promise);
    const originalSelection = store.getState().selectionReducers.moleculeAllSelection;
    try {
      let first;
      await act(async () => {
        first = controller.toggle(1);
        expect(controller.toggle(1)).toBe(first);
      });
      expect(generateMoleculeObject).toHaveBeenCalledTimes(1);
      expect(runtime.loads).toHaveLength(0);
      expect(selectActiveRhsObservationIds(store.getState())).toStrictEqual([]);
      await act(async () => {
        coordinates.resolve(targetFor(observations[0]));
      });
      expect(runtime.loads).toHaveLength(1);
      expect(controller.getSnapshot()['1'].pending).toBe(true);
      expect(selectActiveRhsObservationIds(store.getState())).toStrictEqual([]);
      await run(controller, 2);
      expect(runtime.resources.size).toBe(1);
      await act(async () => {
        rendering.resolve();
        await first;
      });
      expect(selectActiveRhsObservationIds(store.getState())).toStrictEqual(['1', '2']);
      expect(runtime.loads[0].center).toBe(false);
      expect(runtime.loads[0].representations[0].params.radiusSize).toBe(0.11);
      const repr = store.getState().nglReducers.objectsInView.v1_LIGAND.representations[0];
      expect(repr).not.toHaveProperty('nativeRepresentation');
      expect(repr).not.toHaveProperty('parentObject');
      expect(() => JSON.stringify(store.getState())).not.toThrow();
      let removing;
      await act(async () => {
        removing = controller.toggle(1);
      });
      expect(controller.toggle(1)).toBe(removing);
      expect(runtime.resources.size).toBe(2);
      expect(selectActiveRhsObservationIds(store.getState())).toContain('1');
      await act(async () => {
        deletion.resolve();
        await removing;
      });
      expect(runtime.resources.has('v1_LIGAND')).toBe(false);
      expect(runtime.resources.has('v2_LIGAND')).toBe(true);
      expect(selectActiveRhsObservationIds(store.getState())).toStrictEqual(['2']);
      expect(store.getState().selectionReducers.moleculeAllSelection).toBe(originalSelection);
      expect(store.getState().selectionReducers.proteinList).toStrictEqual([99]);
      expect(store.getState().selectionReducers.vectorOnList).toStrictEqual([99]);
      expect(runtime.getOrientation).not.toHaveBeenCalled();
      expect(runtime.setOrientation).not.toHaveBeenCalled();
      expect(runtime.centerOn).not.toHaveBeenCalled();
    } finally {
      test.finish();
    }
  });

  it.each(['coordinates', 'rendering'])(
    'joins an overlapping navigator request during %s without duplicating its native object',
    async phase => {
      expect.hasAssertions();
      const test = setup();
      const coordinates = deferred();
      const rendering = deferred();
      if (phase === 'rendering') test.runtime.loadGates.set('v1_LIGAND', rendering);
      generateMoleculeObject.mockImplementationOnce(() => () => coordinates.promise);
      try {
        await act(async () => {
          test.store.dispatch(addLigand(test.runtime, observations[0], undefined, false));
        });
        if (phase === 'rendering')
          await act(async () => {
            coordinates.resolve(targetFor(observations[0]));
          });
        let completion;
        await act(async () => {
          completion = test.controller.toggle(1);
        });
        expect(generateMoleculeObject).toHaveBeenCalledTimes(1);
        await act(async () => {
          if (phase === 'coordinates') coordinates.resolve(targetFor(observations[0]));
          else rendering.resolve();
          await completion;
        });
        expect(test.runtime.loads).toHaveLength(1);
        expect(test.runtime.resources.size).toBe(1);
        expect(test.controller.getSnapshot()['1'].error).toBeNull();
      } finally {
        test.finish();
      }
    }
  );

  it.each(['coordinates', 'rendering'])(
    'reports a failed %s operation, clears pending/queue state, and allows retry',
    async failure => {
      expect.hasAssertions();
      const log = jest.spyOn(console, 'error').mockImplementation(() => {});
      const test = setup();
      if (failure === 'coordinates')
        generateMoleculeObject.mockImplementationOnce(() => async () => {
          throw Error('bad coordinates');
        });
      else test.runtime.loadGates.set('v1_LIGAND', { promise: Promise.reject(Error('bad rendering')) });
      try {
        await run(test.controller, 1);
        expect(test.controller.getSnapshot()['1']).toStrictEqual({ pending: false, error: `bad ${failure}` });
        expect(selectActiveRhsObservationIds(test.store.getState())).toStrictEqual([]);
        expect(test.store.getState().selectionReducers.toBeDisplayedList).toStrictEqual([]);
        expect(test.store.getState().nglReducers.countOfPendingNglObjects[VIEWS.MAJOR_VIEW]).toBe(0);
        expect(test.runtime.resources.size).toBe(0);

        test.runtime.loadGates.clear();

        await run(test.controller, 1);
        expect(test.controller.getSnapshot()['1'].error).toBeNull();
        expect(test.runtime.resources.size).toBe(1);
      } finally {
        test.finish();

        log.mockRestore();
      }
    }
  );

  it('reports failed disposal without clearing the acknowledged border or resource and retries safely', async () => {
    expect.hasAssertions();
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    const test = setup();
    try {
      await run(test.controller, 1);
      jest.spyOn(test.runtime, 'removeObjects').mockRejectedValueOnce(new Error('disposal failed'));
      await run(test.controller, 1);
      expect(test.controller.getSnapshot()['1']).toStrictEqual({ pending: false, error: 'disposal failed' });
      expect(test.runtime.resources.has('v1_LIGAND')).toBe(true);
      expect(selectActiveRhsObservationIds(test.store.getState())).toStrictEqual(['1']);
      await run(test.controller, 1);
      expect(test.runtime.resources.size).toBe(0);
      expect(selectActiveRhsObservationIds(test.store.getState())).toStrictEqual([]);
    } finally {
      test.finish();

      log.mockRestore();
    }
  });

  it('loads dataset-only observations and removes all global/dataset copies without removing another observation', async () => {
    expect.hasAssertions();
    const test = setup();
    try {
      await run(test.controller, 3);
      expect(test.runtime.loads[0].target.name).toBe('v3_LIGAND_20');
      expect(test.runtime.loads[0].markAsRightSideLigand).toBe(true);
      await run(test.controller, 1);
      await act(async () => {
        test.store.dispatch(
          appendToBeDisplayedListForDataset('10', {
            id: 1,
            datasetID: '10',
            type: 'LIGAND',
            display: true,
            center: false
          })
        );
      });
      expect(test.runtime.resources.has('v1_LIGAND_10')).toBe(true);
      await run(test.controller, 1);
      expect(test.runtime.removals).toStrictEqual(expect.arrayContaining(['v1_LIGAND', 'v1_LIGAND_10']));
      expect([...test.runtime.resources.keys()]).toStrictEqual(['v3_LIGAND_20']);
      expect(test.store.getState().datasetsReducers.ligandLists['10']).toStrictEqual([]);
      expect(test.store.getState().datasetsReducers.toBeDisplayedList['10']).toStrictEqual([]);
    } finally {
      test.finish();
    }
  });

  it('reuses detached cached appearance and restores a hidden ligand without overlapping native objects', async () => {
    expect.hasAssertions();
    const test = setup();
    const appearance = [{ type: 'ball+stick', params: { visible: false, color: 'cyan', radiusSize: 0.4 } }];
    try {
      await act(async () => {
        test.store.dispatch(addLigand(test.runtime, observations[0], undefined, false, false, true, appearance));
      });
      expect(selectActiveRhsObservationIds(test.store.getState())).toStrictEqual([]);
      await run(test.controller, 1);
      expect(test.runtime.removals).toStrictEqual(['v1_LIGAND']);
      expect(test.runtime.resources.size).toBe(1);
      expect(selectActiveRhsObservationIds(test.store.getState())).toStrictEqual(['1']);
      await run(test.controller, 1);
      await run(test.controller, 1);
      expect(test.runtime.loads.at(-1).representations).toStrictEqual([
        { type: 'ball+stick', params: { visible: true, color: 'cyan', radiusSize: 0.4 } }
      ]);
      expect(test.runtime.loads.at(-1).representations[0]).not.toHaveProperty('uuid');
    } finally {
      test.finish();
    }
  });

  it('cancels old-target work before it can enqueue and drops transient feedback', async () => {
    expect.hasAssertions();
    const test = setup();
    try {
      await act(async () => {
        const completion = test.controller.toggle(1);

        test.store.dispatch({ type: 'TEST_TARGET', id: 2 });

        await completion;
      });
      expect(test.runtime.loads).toHaveLength(0);
      expect(test.store.getState().selectionReducers.toBeDisplayedList).toStrictEqual([]);
      expect(test.controller.getSnapshot()).toStrictEqual({});
    } finally {
      test.finish();
    }
  });

  it('shows errors and pending/acknowledged borders and follows navigator removal without releasing ligands on close', async () => {
    expect.hasAssertions();
    const observer = global.ResizeObserver;
    global.ResizeObserver = class {
      observe() {}
      disconnect() {}
    };
    const bounds = jest
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValue({ width: 1000, height: 420 });
    const test = setup(true);
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    const rendering = deferred();

    test.runtime.loadGates.set('v1_LIGAND', rendering);

    generateMoleculeObject.mockImplementationOnce(() => async () => {
      throw new Error('coordinate request failed');
    });
    try {
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Show ligand for v1' }));
      });
      expect(screen.getByRole('alert')).toHaveTextContent('Click image to retry');
      expect(screen.getByRole('button', { name: 'Show ligand for v1' })).toBeEnabled();
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Show ligand for v1' }));
      });
      expect(screen.getByRole('button', { name: 'Show ligand for v1' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Center on ligand for v1' })).toBeDisabled();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Show ligand for v1' })).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByRole('progressbar', { name: 'Updating ligand for v1' })).toBeInTheDocument();
      await act(async () => {
        rendering.resolve();
      });
      expect(screen.getByRole('button', { name: 'Hide ligand for v1' })).toHaveAttribute('aria-pressed', 'true');
      await act(async () => {
        test.store.dispatch(removeLigand(test.runtime, observations[0], true, false));
      });
      expect(screen.getByRole('button', { name: 'Show ligand for v1' })).toHaveAttribute('aria-pressed', 'false');
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Show ligand for v2' }));
      });
      expect(test.runtime.resources.has('v2_LIGAND')).toBe(true);
      cleanup();
      expect(test.runtime.resources.has('v2_LIGAND')).toBe(true);
      expect(test.store.getState().selectionReducers.moleculeAllSelection).toStrictEqual([2]);
    } finally {
      test.finish();

      bounds.mockRestore();
      global.ResizeObserver = observer;
      log.mockRestore();
    }
  });
});
