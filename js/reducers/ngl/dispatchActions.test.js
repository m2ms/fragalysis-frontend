import configureStore from 'redux-mock-store';
import { thunk } from 'redux-thunk';
import { deleteObject, loadObject, setOrientation } from './dispatchActions';
import { getAction } from '../../utils/testUtils';
import {
  decrementCountOfPendingNglObjects,
  deleteNglObject,
  incrementCountOfPendingNglObjects,
  loadNglObject,
  setNglOrientation
} from './actions';
import { OBJECT_TYPE, SELECTION_TYPE } from '../../components/nglView/constants';
import {
  removeFromArtefactsChainList,
  removeFromComplexList,
  removeFromFragmentDisplayList,
  removeFromVectorOnList
} from '../selection/actions';
import { VIEWS } from '../../constants/constants';
import ViewerAdapter from '../../viewer/ViewerAdapter';
const { fn } = jest;

describe("testing ngl reducer's async actions", () => {
  const middlewares = [thunk]; // add your middlewares like `redux-thunk`
  const mockStore = configureStore(middlewares);

  it('should load object', () => {
    expect.hasAssertions();
    let store = mockStore({
      nglReducers: {
        objectsInViewStash: {}
      }
    });
    const target = {
      name: 'My protein',
      OBJECT_TYPE: OBJECT_TYPE.PROTEIN,
      display_div: VIEWS.MAJOR_VIEW,
      property: { a: 'sdff' }
    };

    const stage = new ViewerAdapter();
    stage.loadObject = fn(() =>
      Promise.resolve([
        {
          uuid: null,
          getParameters: fn(() => {}),
          repr: { parameters: {} }
        }
      ])
    );

    // eslint-disable-next-line jest/no-test-return-statement
    return store
      .dispatch(loadObject({ target, stage }))
      .then(async () => {
        const loadAction = await getAction(store, loadNglObject);
        expect(loadAction).not.toBeNull();
        expect(loadAction.target).toStrictEqual(target);
        expect(loadAction.representations.length).toBeGreaterThan(0);
      })
      .finally(async () => {
        expect(await getAction(store, incrementCountOfPendingNglObjects)).not.toBeNull();
        expect(await getAction(store, decrementCountOfPendingNglObjects)).not.toBeNull();
      });
  });

  it('should propagate object loading failures and clear the pending counter', async () => {
    expect.hasAssertions();
    const store = mockStore({
      nglReducers: {
        objectsInViewStash: {}
      }
    });
    const target = {
      name: 'Broken protein',
      OBJECT_TYPE: OBJECT_TYPE.PROTEIN,
      display_div: VIEWS.MAJOR_VIEW
    };
    const error = new Error('Moorhen failed to load molecule');
    const stage = new ViewerAdapter();
    stage.loadObject = fn(() => Promise.reject(error));
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    try {
      await expect(store.dispatch(loadObject({ target, stage }))).rejects.toBe(error);
      expect(await getAction(store, incrementCountOfPendingNglObjects)).not.toBeNull();
      expect(await getAction(store, decrementCountOfPendingNglObjects)).not.toBeNull();
      expect(await getAction(store, loadNglObject)).toBeNull();
    } finally {
      consoleError.mockRestore();
    }
  });

  it('should delete object', async () => {
    expect.hasAssertions();
    let store = mockStore();
    const targetLigand = {
      selectionType: SELECTION_TYPE.LIGAND,
      moleculeId: 1
    };
    const targetComplex = {
      selectionType: SELECTION_TYPE.COMPLEX,
      moleculeId: 2
    };
    const targetVector = {
      selectionType: SELECTION_TYPE.VECTOR,
      moleculeId: 3
    };
    const targetArtefact = {
      selectionType: SELECTION_TYPE.ARTEFACTS,
      moleculeId: 4
    };

    const stage = new ViewerAdapter();
    stage.getObjects = fn(() => [1, 2, 3]);
    stage.removeObject = fn();

    await store.dispatch(deleteObject(targetLigand, stage, true));
    expect(await getAction(store, removeFromFragmentDisplayList)).not.toBeNull();
    store.clearActions();

    await store.dispatch(deleteObject(targetComplex, stage, true));
    expect(await getAction(store, removeFromComplexList)).not.toBeNull();
    store.clearActions();

    await store.dispatch(deleteObject(targetVector, stage, true));
    expect(await getAction(store, removeFromVectorOnList)).not.toBeNull();
    store.clearActions();

    await store.dispatch(deleteObject(targetArtefact, stage, true));
    expect(await getAction(store, removeFromArtefactsChainList)).not.toBeNull();
    store.clearActions();

    await store.dispatch(deleteObject(targetLigand, stage, false));
    expect(await getAction(store, deleteNglObject)).not.toBeNull();
    expect(stage.removeObject).toHaveBeenCalledTimes(15);
  });

  it('should set orientation', async () => {
    expect.hasAssertions();
    const orientation = {
      elements: [1, 2, 3, 'df']
    };

    const div_id = 'MAJOR_VIEW';

    let store = mockStore({
      nglReducers: {
        nglOrientations: {
          first: { elements: [35, 'g'] },
          [div_id]: orientation,
          third: { elements: [235, 'g3'] }
        }
      }
    });

    await store.dispatch(setOrientation(div_id, orientation));
    expect(await store.getActions()).toHaveLength(0);

    let storeWithAnotherOrientationElem = mockStore({
      nglReducers: {
        nglOrientations: {
          first: { elements: [35, 'g'] },
          [div_id]: { elements: [3534, 'wfsweg'] },
          third: { elements: [235, 'g3'] }
        }
      }
    });

    await storeWithAnotherOrientationElem.dispatch(setOrientation(div_id, orientation));
    expect(await getAction(storeWithAnotherOrientationElem, setNglOrientation)).not.toBeNull();

    let storeWithoutOrientations = mockStore({
      nglReducers: {
        nglOrientations: undefined
      }
    });

    await storeWithoutOrientations.dispatch(setOrientation(div_id, orientation));
    expect(await getAction(storeWithoutOrientations, setNglOrientation)).not.toBeNull();

    let storeWithNotAllOrientations = mockStore({
      nglReducers: {
        nglOrientations: {
          first: { elements: [35, 'g'] },
          second: { elements: [235, 'g3'] }
        }
      }
    });
    await storeWithNotAllOrientations.dispatch(setOrientation(div_id, orientation));
    expect(await getAction(storeWithNotAllOrientations, setNglOrientation)).not.toBeNull();
  });
});
