import React, { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { applyMiddleware, combineReducers, legacy_createStore } from 'redux';
import { thunk } from 'redux-thunk';
import { ThemeProvider } from '../../../ui/styles';
import { getTheme } from '../../../theme';
import { selectionReducers } from '../../../reducers/selection/selectionReducers';
import { setRHSDisplayAllMolecules, setRHSSelectedTags } from '../../../reducers/selection/actions';
import { molecule } from '../molecule/redux/reducer';
import { setSearchStringOfHitNavigator } from '../molecule/redux/actions';
import { RhsReviewPanel } from './RhsReviewPanel';
import { ReviewContext } from './ReviewContext';
import { ToastContext } from '../../toast';

jest.mock('../../rdkit/RDKitContext', () => ({ useRDKit: () => ({ RDKitModule: null, loading: false }) }));
jest.mock('../../../utils/djangoContext', () => ({ DJANGO_CONTEXT: { pk: 7 } }));

const observations = [1, 2, 3].map(id => ({ id, code: `v${id}a`, cmpd: id, tags_set: id < 3 ? [id] : [] }));
const tags = [1, 2].map(id => ({ id, meta_category: 'rhs', category: 1, site_observations: [id] }));
const OrderingControls = () => {
  const [orderingBySide, setOrdering] = useState({});
  return (
    <ReviewContext.Provider value={{ orderingBySide, setOrdering: (_side, value) => setOrdering({ rhs: value }) }}>
      <button onClick={() => setOrdering({ rhs: { ascending: false } })}>Reverse toolbar order</button>
      <RhsReviewPanel />
    </ReviewContext.Provider>
  );
};

describe('rhs review observation cards', () => {
  it('shows both datasets, follows tag/search/ordering state, and leaves images inactive', () => {
    expect.hasAssertions();
    const originalObserver = global.ResizeObserver;
    global.ResizeObserver = class {
      observe() {}
      disconnect() {}
    };
    const bounds = jest
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValue({ width: 1000, height: 420 });
    const api = {
      all_mol_lists: observations,
      rhs_compounds_list: [],
      tagList: tags,
      categoryList: [],
      noTagsReceived: false,
      rhsDataIsLoaded: true
    };
    const datasets = { moleculeLists: { 10: [observations[0]], 20: [observations[1], observations[2]] } };
    const reducer = combineReducers({
      apiReducers: (state = api) => state,
      datasetsReducers: (state = datasets) => state,
      selectionReducers,
      previewReducers: combineReducers({ molecule })
    });
    const initial = reducer(undefined, {});
    const cached = {
      ...initial,
      selectionReducers: selectionReducers(initial.selectionReducers, setRHSSelectedTags(tags)),
      previewReducers: {
        molecule: {
          ...initial.previewReducers.molecule,
          imageCache: { 1: '<svg xmlns="http://www.w3.org/2000/svg" />' }
        }
      }
    };
    const viewStore = legacy_createStore(reducer, cached, applyMiddleware(thunk));
    const view = render(
      <Provider store={viewStore}>
        <ThemeProvider theme={getTheme()}>
          <ToastContext.Provider value={{ toastInfo: jest.fn() }}>
            <OrderingControls />
          </ToastContext.Provider>
        </ThemeProvider>
      </Provider>
    );
    try {
      expect(screen.getAllByRole('listitem').map(item => item.getAttribute('aria-label'))).toStrictEqual([
        'v1a',
        'v2a'
      ]);
      expect(screen.getByText('Molecule image unavailable')).toBeInTheDocument();
      const beforeClick = viewStore.getState();
      fireEvent.click(screen.getByRole('img', { name: 'Molecule v1a' }));
      expect(viewStore.getState()).toBe(beforeClick);
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
      act(() => viewStore.dispatch(setRHSDisplayAllMolecules(true)));
      expect(screen.getAllByRole('listitem')).toHaveLength(3);
      fireEvent.click(screen.getByRole('button', { name: 'Reverse toolbar order' }));
      expect(screen.getAllByRole('listitem').map(item => item.getAttribute('aria-label'))).toStrictEqual([
        'v3a',
        'v2a',
        'v1a'
      ]);
      act(() => viewStore.dispatch(setSearchStringOfHitNavigator('v2', 'rhs')));
      expect(screen.getAllByRole('listitem')).toHaveLength(1);
      expect(screen.getByRole('listitem')).toHaveAttribute('aria-label', 'v2a');
      expect(viewStore.getState().selectionReducers.lhs_selectedTagList).toBe(
        initial.selectionReducers.lhs_selectedTagList
      );
    } finally {
      view.unmount();
      global.ResizeObserver = originalObserver;
      bounds.mockRestore();
    }
  });
});
