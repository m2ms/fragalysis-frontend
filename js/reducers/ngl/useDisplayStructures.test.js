import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';
import { applyMiddleware, combineReducers, legacy_createStore } from 'redux';
import { thunk } from 'redux-thunk';
import { selectionReducers } from '../selection/selectionReducers';
import { appendToBeDisplayedList, updateInToBeDisplayedList } from '../selection/actions';
import { NglContext } from '../../components/nglView/nglProvider';
import { generateMoleculeObject, generateHitProteinObject } from '../../components/nglView/generatingObjects';
import { loadObject, deleteObject } from './dispatchActions';
import { useDisplayLigandLHS } from './useDisplayLigandLHS';
import { useDisplayProteinLHS } from './useDisplayProteinLHS';

jest.mock('../../components/nglView/nglProvider', () => ({ NglContext: require('react').createContext() }));
jest.mock('../../components/nglView/generatingObjects', () => ({
  generateMoleculeId: data => ({ id: data.id }),
  generateMoleculeObject: jest.fn(),
  generateHitProteinObject: jest.fn()
}));
jest.mock('../../viewer/qualityInformation', () => ({ readQualityInformation: () => () => null }));
jest.mock('./dispatchActions', () => ({ loadObject: jest.fn(), deleteObject: jest.fn() }));

const deferred = () => {
  let resolve;
  const promise = new Promise(accept => { resolve = accept; });
  return { promise, resolve };
};

describe('display effects during pose transfers', () => {
  it.each([
    ['LIGAND', useDisplayLigandLHS, generateMoleculeObject, 'fragmentDisplayList'],
    ['PROTEIN', useDisplayProteinLHS, generateHitProteinObject, 'proteinList']
  ])('does not duplicate %s loads or lose removal requested during coordinate fetching', async (type, useDisplay, generate, list) => {
    jest.clearAllMocks();
    const coordinates = deferred();
    const rendering = deferred();
    const deletion = deferred();
    const target = { name: `source_${type}`, sdf_info: 'sdf', moleculeId: 1 };
    generate.mockImplementationOnce(() => () => coordinates.promise).mockImplementation(() => async () => target);
    loadObject.mockImplementation(() => () => rendering.promise);
    deleteObject.mockImplementation(() => () => deletion.promise);
    const store = legacy_createStore(combineReducers({
      selectionReducers,
      apiReducers: (state = { all_mol_lists: [{ id: 1, code: 'source' }] }) => state
    }), applyMiddleware(thunk));
    const stage = {};
    const context = { getNglView: () => ({ stage }), getViewerAdapter: () => stage };
    const wrapper = ({ children }) => <React.StrictMode><Provider store={store}>
      <NglContext.Provider value={context}>{children}</NglContext.Provider>
    </Provider></React.StrictMode>;
    store.dispatch(appendToBeDisplayedList({ id: 1, type, display: true }));
    const { rerender } = renderHook(() => useDisplay(), { wrapper });
    await act(async () => {});
    await act(async () => {
      store.dispatch(appendToBeDisplayedList({ id: 2, type: 'VECTOR', display: true }));
      rerender();
    });
    expect(generate).toHaveBeenCalledTimes(1);
    await act(async () => { store.dispatch(updateInToBeDisplayedList({ id: 1, type, display: false })); });
    expect(deleteObject).not.toHaveBeenCalled();
    await act(async () => { coordinates.resolve(target); });
    expect(loadObject).toHaveBeenCalledTimes(1);
    expect(deleteObject).not.toHaveBeenCalled();
    await act(async () => { rendering.resolve(); });
    expect(deleteObject).toHaveBeenCalledTimes(1);
    expect(store.getState().selectionReducers[list]).toContain(1);
    await act(async () => {
      store.dispatch(appendToBeDisplayedList({ id: 3, type: 'VECTOR', display: true }));
      rerender();
    });
    expect(deleteObject).toHaveBeenCalledTimes(1);
    await act(async () => { deletion.resolve(); });
    expect(store.getState().selectionReducers[list]).toStrictEqual([]);
    expect(store.getState().selectionReducers.toBeDisplayedList.some(item => item.id === 1)).toBe(false);
  });
});
