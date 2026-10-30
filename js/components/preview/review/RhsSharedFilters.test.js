import React, { useState } from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { applyMiddleware, combineReducers, legacy_createStore } from 'redux';
import { thunk } from 'redux-thunk';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../../../ui/styles';
import { getTheme } from '../../../theme';
import { selectionReducers } from '../../../reducers/selection/selectionReducers';
import {
  setCoordinateFilterResults,
  setIsCoordinateFilterApplied,
  setShowDisplayedMolecules,
  setUnifiedFilterItem
} from '../../../reducers/selection/actions';
import nglReducers from '../../../reducers/ngl/nglReducers';
import { loadNglObject, deleteNglObject } from '../../../reducers/ngl/actions';
import { OBJECT_TYPE } from '../../nglView/constants';
import { VIEWS } from '../../../constants/constants';
import { molecule } from '../molecule/redux/reducer';
import { setSearchStringOfHitNavigator } from '../molecule/redux/actions';
import { PoseListRHS } from '../molecule/poseListRHS';
import { NglContext } from '../../nglView/nglProvider';
import { LoadingContext } from '../../loading';
import ObservationUnifiedViewWrapper from '../molecule/observationUnifiedView/observationUnifiedViewWrapper';
import { filterCompoundsByStructure } from '../molecule/observationUnifiedView/api';
import { RhsReviewPanel } from './RhsReviewPanel';
import { ReviewContext } from './ReviewContext';
import { RHS_REVIEW_VIEW_CONFIG, useRhsObservationResult } from './useRhsObservationResult';
import { ToastContext } from '../../toast';

jest.mock('../../../utils/djangoContext', () => ({ DJANGO_CONTEXT: { pk: 7 } }));
jest.mock('../../rdkit/RDKitContext', () => ({ useRDKit: () => ({ RDKitModule: null, loading: false }) }));
jest.mock('@loschmidt/jsme-react', () => ({
  jsmeSetup: jest.fn(),
  Jsme: ({ smiles }) => <output aria-label="Structure editor">{smiles}</output>
}));
jest.mock('../molecule/observationUnifiedView/api', () => ({
  ...jest.requireActual('../molecule/observationUnifiedView/api'),
  filterCompoundsByStructure: jest.fn()
}));
jest.mock('../molecule/observationUnifiedView/observationUnifiedView', () => ({
  __esModule: true,
  default: ({ data, previousPose, nextPose }) => (
    <tr aria-label={data.associatedObs[0].virtual_name}>
      <td>{data.main_site_observation}</td>
      <td>{previousPose?.main_site_observation}</td>
      <td>{nextPose?.main_site_observation}</td>
    </tr>
  )
}));
jest.mock('../molecule/observationUnifiedView/table/filters/filterWrapper', () => ({
  FilterWrapper: ({ title, children, handleReset }) => (
    <section aria-label={title}>
      <button onClick={handleReset}>Reset {title}</button>
      {children}
    </section>
  )
}));

const navigation = jest.fn();
let currentResult;
const Navigator = () => {
  const result = useRhsObservationResult();
  currentResult = result;
  return (
    <ObservationUnifiedViewWrapper
      viewConfig={RHS_REVIEW_VIEW_CONFIG}
      items={result.poses.slice(0, 30)}
      navigationItems={result.poses}
      columnFilterConfig={result.columnFilterConfig}
      onPoseTransferNavigationItemsChange={navigation}
      allSelectedMolecules={[]}
      addMoleculeViewRef={jest.fn()}
      handleSetTagEditorAnchorEl={jest.fn()}
    />
  );
};
const Workspace = ({ realNavigator }) => {
  const [orderingBySide, setOrdering] = useState({});
  return (
    <ReviewContext.Provider value={{ orderingBySide, setOrdering: (_side, value) => setOrdering({ rhs: value }) }}>
      <button onClick={() => setOrdering({ rhs: { ascending: false } })}>Reverse toolbar</button>
      {realNavigator ? <PoseListRHS /> : <Navigator />}
      <ToastContext.Provider value={{ toastInfo: jest.fn() }}>
        <RhsReviewPanel />
      </ToastContext.Provider>
    </ReviewContext.Provider>
  );
};

const setup = (realNavigator = false) => {
  const observations = Array.from({ length: 80 }, (_, i) => ({
    id: i + 1,
    cmpd: i + 1,
    code: `uploaded-observation-${i + 1}`,
    virtual_name: `v${i + 1}a`,
    smiles: 'CC',
    tags_set: [1]
  }));
  const api = {
    target_on: 1,
    target_id_list: [{ id: 1, title: 'Test' }],
    rhsDataIsLoaded: true,
    all_mol_lists: observations,
    tagList: [{ id: 1, meta_category: 'rhs' }],
    categoryList: [],
    rhs_compounds_list: observations.map(o => ({
      id: o.id,
      compound: o.cmpd,
      code: o.code,
      main_site_observation: o.id,
      site_observations: [o.id],
      associatedObs: [o],
      activityData: [
        { property_name: 'score', raw_value: o.id },
        { property_name: 'series', text_value: o.id % 2 ? 'alpha' : 'beta' }
      ]
    })),
    quality_statuses: [],
    lhs_extra_columns: [
      { result_property: 'score', data_type: 'float', visible: true },
      { result_property: 'series', data_type: 'text', visible: true }
    ]
  };
  const reducer = combineReducers({
    selectionReducers,
    previewReducers: combineReducers({ molecule }),
    apiReducers: (state = api) => state,
    targetReducers: (state = { currentProject: {} }) => state,
    nglReducers,
    datasetsReducers: (state = { moleculeLists: { 10: observations } }) => state
  });
  const initial = reducer(undefined, {});
  initial.selectionReducers = {
    ...initial.selectionReducers,
    rhs_selectedTagList: [{ id: 1 }],
    unifiedFilter: { detail: { value: 'LHS untouched' }, molecule: { smiles: 'N' } }
  };
  const store = legacy_createStore(reducer, initial, applyMiddleware(thunk));
  render(
    <Provider store={store}>
      <ThemeProvider theme={getTheme()}>
        <MemoryRouter>
          <NglContext.Provider value={{ getNglView: () => null }}>
            <LoadingContext.Provider value={{ moleculesAndTagsAreLoading: false }}>
              <Workspace realNavigator={realNavigator} />
            </LoadingContext.Provider>
          </NglContext.Provider>
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  );
  return store;
};

const withLayout = async check => {
  const observer = global.ResizeObserver;
  global.ResizeObserver = class {
    observe() {}
    disconnect() {}
  };
  const bounds = jest
    .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
    .mockReturnValue({ width: 1000, height: 420 });
  navigation.mockClear();
  try {
    await check();
  } finally {
    cleanup();
    bounds.mockRestore();
    global.ResizeObserver = observer;
  }
};

describe('rhs navigator/review controlled filters', () => {
  it('hides all inactive cards and navigator rows, follows ligand acknowledgements, and recovers with Show all', async () => {
    expect.hasAssertions();
    await withLayout(async () => {
      const store = setup(true);
      const ligand = {
        name: 'uploaded-observation-80_LIGAND_10',
        moleculeId: 80,
        OBJECT_TYPE: OBJECT_TYPE.LIGAND,
        display_div: VIEWS.MAJOR_VIEW
      };
      const protein = {
        ...ligand,
        name: 'uploaded-observation-79_PROTEIN_10',
        moleculeId: 79,
        OBJECT_TYPE: OBJECT_TYPE.HIT_PROTEIN
      };
      const representations = [{ uuid: 'ack', type: 'ball+stick', params: {}, visible: true }];
      act(() => {
        store.dispatch(loadNglObject(ligand, representations));
        store.dispatch(loadNglObject(protein, representations));
        store.dispatch(setShowDisplayedMolecules(false, 'rhs'));
      });
      fireEvent.click(screen.getByRole('button', { name: 'Hide all inactive', exact: true }));
      expect(store.getState().selectionReducers.rhs_selectedTagList).toStrictEqual([]);
      expect(screen.getAllByRole('listitem').map(item => item.getAttribute('aria-label'))).toStrictEqual(['v80a']);
      expect(screen.getByRole('row', { name: 'v80a' })).toBeInTheDocument();
      expect(screen.queryByRole('row', { name: 'v79a' })).not.toBeInTheDocument();
      const added = { ...ligand, name: 'uploaded-observation-79_LIGAND_10', moleculeId: 79 };
      act(() => store.dispatch(loadNglObject(added, representations)));
      expect(screen.getByRole('listitem', { name: 'v79a' })).toBeInTheDocument();
      act(() => store.dispatch(deleteNglObject(added)));
      expect(screen.queryByRole('listitem', { name: 'v79a' })).not.toBeInTheDocument();
      act(() => store.dispatch(deleteNglObject(ligand)));
      expect(screen.getByText('No designs to review.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Review', exact: true })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Show all', exact: true })).toBeEnabled();
      expect(store.getState().nglReducers.objectsInView[protein.name]).toBeDefined();
      fireEvent.click(screen.getByRole('button', { name: 'Show all', exact: true }));
      expect(screen.getByRole('row', { name: 'v1a' })).toBeInTheDocument();
      expect(screen.getByRole('listitem', { name: 'v1a' })).toBeInTheDocument();
      expect(store.getState().selectionReducers.showDisplayedMoleculesRHS).toBe(false);
      expect(store.getState().nglReducers.objectsInView[protein.name]).toBeDefined();
    });
  });

  it('updates both views before pagination, preserves full arrow order, and reflects external reset in the widgets', async () => {
    expect.hasAssertions();
    await withLayout(async () => {
      const store = setup();
      expect(currentResult.poses).toHaveLength(80);
      expect(screen.getAllByRole('row')).toHaveLength(31);
      expect(navigation.mock.calls.at(-1)[0]).toHaveLength(80);
      const score = within(screen.getByRole('region', { name: 'Sort / Filter (score)' }));
      // An observation outside the initial 30 rows becomes visible through the shared column predicate.
      fireEvent.change(score.getByRole('textbox'), { target: { value: '80' } });
      expect(currentResult.poses.map(p => p.main_site_observation)).toStrictEqual([80]);
      expect(screen.getByRole('row', { name: 'v80a' })).toBeInTheDocument();
      expect(screen.getByRole('listitem', { name: 'v80a' })).toBeInTheDocument();
      act(() => store.dispatch(setUnifiedFilterItem('rhs', { filters: {}, sortings: {} })));
      expect(score.getByRole('textbox')).toHaveValue('');
      expect(currentResult.poses).toHaveLength(80);
      fireEvent.click(screen.getByRole('button', { name: 'Reverse toolbar' }));
      expect(currentResult.poses[0].main_site_observation).toBe(80);
      expect(screen.getAllByRole('listitem')[0]).toHaveAttribute('aria-label', 'v80a');
      fireEvent.click(score.getByRole('checkbox', { name: 'Enabled' }));
      fireEvent.click(score.getByRole('checkbox', { name: 'Ascending' }));
      expect(currentResult.poses[0].main_site_observation).toBe(1);
      expect(navigation.mock.calls.at(-1)[0][30].main_site_observation).toBe(31);
      const observation = within(screen.getByRole('region', { name: 'Advanced Search' }));
      fireEvent.click(observation.getByRole('checkbox', { name: 'Observation code', exact: true }));
      fireEvent.change(observation.getByRole('textbox'), { target: { value: 'v79a' } });
      expect(currentResult.poses.map(p => p.main_site_observation)).toStrictEqual([79]);
      expect(screen.getByRole('listitem', { name: 'v79a' })).toBeInTheDocument();
      act(() => store.dispatch(setUnifiedFilterItem('rhs', { filters: {}, sortings: {} })));
      expect(observation.getByRole('textbox')).toHaveValue('');
      expect(observation.getByRole('checkbox', { name: 'Observation code', exact: true })).not.toBeChecked();
      expect(score.getByRole('checkbox', { name: 'Enabled' })).not.toBeChecked();
      expect(currentResult.poses).toHaveLength(80);
      expect(store.getState().selectionReducers.unifiedFilter.detail).toStrictEqual({ value: 'LHS untouched' });
      expect(store.getState().selectionReducers.unifiedFilter.molecule).toStrictEqual({ smiles: 'N' });
      const before = currentResult.poses;
      act(() => store.dispatch({ type: 'unrelated action' }));
      expect(currentResult.poses).toBe(before);
      act(() => store.dispatch(setUnifiedFilterItem('unrelatedLHS', { value: 'changed' })));
      expect(currentResult.poses).toBe(before);
    });
  });

  it('controls text, review and structure values independently of the legacy LHS filters', async () => {
    expect.hasAssertions();
    await withLayout(async () => {
      const store = setup();
      const series = within(screen.getByRole('region', { name: 'Sort / Filter (series)' }));
      fireEvent.change(series.getByRole('textbox'), { target: { value: 'beta' } });
      expect(currentResult.poses).toHaveLength(40);
      const peer = within(screen.getByRole('region', { name: 'Sort / Filter (Peer Review)' }));
      fireEvent.click(peer.getAllByRole('checkbox', { name: 'Good', exact: true })[0]);
      expect(currentResult.poses).toHaveLength(0);
      expect(screen.getByText('No designs to review.')).toBeInTheDocument();
      act(() => store.dispatch(setUnifiedFilterItem('rhs', { filters: {}, sortings: {} })));
      expect(series.getByRole('textbox')).toHaveValue('');
      expect(peer.getAllByRole('checkbox', { name: 'Good', exact: true })[0]).not.toBeChecked();
      const structure = within(screen.getByRole('region', { name: 'Filter (Molecule)' }));
      fireEvent.change(structure.getByRole('textbox'), { target: { value: 'CO' } });
      expect(structure.getByLabelText('Structure editor')).toHaveTextContent('CO');
      act(() => store.dispatch(setUnifiedFilterItem('rhs', { filters: {}, sortings: {} })));
      expect(structure.getByRole('textbox')).toHaveValue('');
      expect(structure.getByLabelText('Structure editor')).toHaveTextContent('');
      expect(currentResult.poses).toHaveLength(80);
    });
  });

  it('ignores a structure reply after reset and applies an empty successful match to both views', async () => {
    expect.hasAssertions();
    await withLayout(async () => {
      const store = setup();
      const structure = within(screen.getByRole('region', { name: 'Filter (Molecule)' }));
      let complete;
      filterCompoundsByStructure.mockImplementationOnce(
        () =>
          new Promise(resolve => {
            complete = resolve;
          })
      );
      fireEvent.change(structure.getByRole('textbox'), { target: { value: 'CO' } });
      fireEvent.click(structure.getByRole('button', { name: 'Apply filter' }));
      fireEvent.click(screen.getByRole('button', { name: 'Show all', exact: true }));
      await act(async () => complete([80]));
      expect(currentResult.poses).toHaveLength(80);
      expect(structure.getByRole('textbox')).toHaveValue('');
      filterCompoundsByStructure.mockResolvedValueOnce([]);
      fireEvent.change(structure.getByRole('textbox'), { target: { value: 'NN' } });
      await act(async () => fireEvent.click(structure.getByRole('button', { name: 'Apply filter' })));
      expect(currentResult.poses).toHaveLength(0);
      expect(screen.getByText('No designs to review.')).toBeInTheDocument();
      expect(store.getState().selectionReducers.unifiedFilter.molecule).toStrictEqual({ smiles: 'N' });
    });
  });

  it('resets controlled RHS widgets and complete results with Show all while preserving column sorts and the scene', async () => {
    expect.hasAssertions();
    await withLayout(async () => {
      const store = setup();
      const score = within(screen.getByRole('region', { name: 'Sort / Filter (score)' }));
      const series = within(screen.getByRole('region', { name: 'Sort / Filter (series)' }));
      const peer = within(screen.getByRole('region', { name: 'Sort / Filter (Peer Review)' }));
      const structure = within(screen.getByRole('region', { name: 'Filter (Molecule)' }));
      const observation = within(screen.getByRole('region', { name: 'Advanced Search' }));
      fireEvent.change(score.getByRole('textbox'), { target: { value: '80' } });
      fireEvent.click(score.getByRole('checkbox', { name: 'Enabled' }));
      fireEvent.click(score.getByRole('checkbox', { name: 'Ascending' }));
      fireEvent.change(series.getByRole('textbox'), { target: { value: 'beta' } });
      fireEvent.click(peer.getAllByRole('checkbox', { name: 'Good', exact: true })[0]);
      fireEvent.change(structure.getByRole('textbox'), { target: { value: 'CO' } });
      fireEvent.click(observation.getByRole('checkbox', { name: 'Observation code', exact: true }));
      fireEvent.change(observation.getByRole('textbox'), { target: { value: 'v79a' } });
      act(() => {
        store.dispatch(setSearchStringOfHitNavigator('missing', 'rhs'));
        store.dispatch(setCoordinateFilterResults([80], 'rhs'));
        store.dispatch(setIsCoordinateFilterApplied(true, 'rhs'));
      });
      expect(currentResult.poses).toHaveLength(0);
      const before = store.getState();
      fireEvent.click(screen.getByRole('button', { name: 'Show all', exact: true }));
      expect(score.getByRole('textbox')).toHaveValue('');
      expect(score.getByRole('checkbox', { name: 'Enabled' })).toBeChecked();
      expect(score.getByRole('checkbox', { name: 'Ascending' })).toBeChecked();
      expect(series.getByRole('textbox')).toHaveValue('');
      expect(structure.getByRole('textbox')).toHaveValue('');
      expect(structure.getByLabelText('Structure editor')).toHaveTextContent('');
      expect(peer.getAllByRole('checkbox', { name: 'Good', exact: true })[0]).not.toBeChecked();
      expect(observation.getByRole('textbox')).toHaveValue('');
      expect(observation.getByRole('checkbox', { name: 'Observation code', exact: true })).not.toBeChecked();
      expect(currentResult.poses).toHaveLength(80);
      expect(currentResult.reviewPoses).toHaveLength(80);
      expect(currentResult.poses[0].main_site_observation).toBe(1);
      expect(navigation.mock.calls.at(-1)[0]).toHaveLength(80);
      expect(store.getState().previewReducers.molecule.searchStringRHS).toBe('');
      expect(store.getState().nglReducers).toBe(before.nglReducers);
      expect(store.getState().selectionReducers.toBeDisplayedList).toBe(before.selectionReducers.toBeDisplayedList);
      expect(store.getState().selectionReducers.unifiedFilter.detail).toBe(
        before.selectionReducers.unifiedFilter.detail
      );
      expect(store.getState().selectionReducers.isCoordinateFilterApplied).toBe(true);
      expect(store.getState().selectionReducers.isCoordinateFilterAppliedRHS).toBe(false);
    });
  });

  it('clears the actual navigator search with Show all and cancels a pending debounce before its first update', async () => {
    expect.hasAssertions();
    jest.useFakeTimers();
    try {
      await withLayout(async () => {
        const store = setup(true);
        const search = screen.getByPlaceholderText('Search');
        fireEvent.change(search, { target: { value: 'v79a' } });
        expect(search).toHaveValue('v79a');
        expect(store.getState().previewReducers.molecule.searchStringRHS).toBe('');
        fireEvent.click(screen.getByRole('button', { name: 'Show all', exact: true }));
        expect(screen.getByPlaceholderText('Search')).toHaveValue('');
        act(() => jest.advanceTimersByTime(1000));
        expect(store.getState().previewReducers.molecule.searchStringRHS).toBe('');
        expect(screen.getByRole('row', { name: 'v1a' })).toBeInTheDocument();
        fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: 'v79a' } });
        act(() => jest.advanceTimersByTime(1000));
        expect(screen.getByRole('row', { name: 'v79a' })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Show all', exact: true }));
        expect(screen.getByPlaceholderText('Search')).toHaveValue('');
        expect(screen.getByRole('row', { name: 'v1a' })).toBeInTheDocument();
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('keeps real navigator filter controls mounted through an empty result and recovers rows after reset', async () => {
    expect.hasAssertions();
    await withLayout(async () => {
      setup(true);
      const observation = within(screen.getByRole('region', { name: 'Advanced Search' }));
      const checkbox = observation.getByRole('checkbox', { name: 'Observation code', exact: true });
      fireEvent.click(checkbox);
      expect(screen.getByText('No designs to review.')).toBeInTheDocument();
      expect(observation.getByRole('textbox')).toBeInTheDocument();
      fireEvent.change(observation.getByRole('textbox'), { target: { value: 'v79a' } });
      expect(screen.getByRole('listitem', { name: 'v79a' })).toBeInTheDocument();
      expect(screen.getByRole('row', { name: 'v79a' })).toBeInTheDocument();
      fireEvent.change(observation.getByRole('textbox'), { target: { value: 'uploaded-observation-79' } });
      expect(screen.getByRole('listitem', { name: 'v79a' })).toBeInTheDocument();
      fireEvent.change(observation.getByRole('textbox'), { target: { value: 'no matching design' } });
      expect(screen.queryByRole('row', { name: 'v79a' })).not.toBeInTheDocument();
      fireEvent.click(observation.getByRole('button', { name: 'Reset Advanced Search' }));
      expect(checkbox).not.toBeChecked();
      expect(observation.getByRole('textbox')).toHaveValue('');
      expect(screen.getByRole('row', { name: 'v1a' })).toBeInTheDocument();
      expect(screen.getByRole('listitem', { name: 'v1a' })).toBeInTheDocument();
      expect(screen.getAllByRole('row')).toHaveLength(31);
      fireEvent.click(screen.getByRole('button', { name: 'Load next 30' }));
      expect(screen.getAllByRole('row')).toHaveLength(61);
    });
  });

  it('retains an acknowledged protein card with navigator bypass off and keeps Review available until its last object is removed', async () => {
    expect.hasAssertions();
    await withLayout(async () => {
      const store = setup(true);
      act(() => store.dispatch(setShowDisplayedMolecules(false, 'rhs')));
      const observation = within(screen.getByRole('region', { name: 'Advanced Search' }));
      fireEvent.click(observation.getByRole('checkbox', { name: 'Observation code', exact: true }));
      fireEvent.change(observation.getByRole('textbox'), { target: { value: 'v3a' } });
      const target = {
        name: 'uploaded-observation-80_PROTEIN_10',
        moleculeId: 80,
        OBJECT_TYPE: OBJECT_TYPE.HIT_PROTEIN,
        display_div: VIEWS.MAJOR_VIEW
      };
      act(() => store.dispatch(loadNglObject(target, [{ uuid: 'ack', type: 'cartoon', params: {}, visible: true }])));
      expect(screen.getAllByRole('listitem').map(item => item.getAttribute('aria-label'))).toStrictEqual([
        'v80a',
        'v3a'
      ]);
      expect(screen.queryByRole('row', { name: 'v80a' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Review', exact: true })).toBeEnabled();
      fireEvent.click(observation.getByRole('button', { name: 'Reset Advanced Search' }));
      expect(screen.getAllByRole('listitem')[0]).toHaveAttribute('aria-label', 'v1a');
      expect(screen.queryByRole('listitem', { name: 'v80a' })).not.toBeInTheDocument();
      fireEvent.click(observation.getByRole('checkbox', { name: 'Observation code', exact: true }));
      fireEvent.change(observation.getByRole('textbox'), { target: { value: 'no matching observation' } });
      expect(screen.getAllByRole('listitem')).toHaveLength(1);
      expect(screen.getByRole('button', { name: 'Review', exact: true })).toBeEnabled();
      act(() => store.dispatch(deleteNglObject(target)));
      expect(screen.getByText('No designs to review.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Review', exact: true })).toBeDisabled();
      expect(observation.getByRole('textbox')).toBeInTheDocument();
    });
  });
});
