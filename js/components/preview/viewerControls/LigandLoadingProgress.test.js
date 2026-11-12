import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { combineReducers, legacy_createStore } from 'redux';
import { ThemeProvider } from '../../../ui/styles';
import { getTheme } from '../../../theme';
import { selectionReducers } from '../../../reducers/selection/selectionReducers';
import apiReducers from '../../../reducers/api/apiReducers';
import nglReducers from '../../../reducers/ngl/nglReducers';
import { previewReducers } from '../redux';
import { setToBeDisplayedList, updateInToBeDisplayedList } from '../../../reducers/selection/actions';
import { appendLigandData } from '../../../reducers/api/actions';
import { loadNglObject, deleteNglObject } from '../../../reducers/ngl/actions';
import { ViewerControls } from './index';
import { getLigandLoadingProgress } from './LigandLoadingProgress';
import {
  bulkLigandPreset,
  getBulkLigandSettings,
  setBulkLigandSettings
} from '../../../reducers/ngl/bulkLigandSettings';

jest.mock('../../nglView/nglProvider', () => ({ NglContext: require('react').createContext() }));
jest.mock('./settingsControls', () => ({ SettingControls: () => null }));
jest.mock('./displayControls', () => ({ __esModule: true, default: () => null }));
jest.mock('./mouseControls', () => ({ MouseControls: () => null }));
jest.mock('./BackgroundColorToggle', () => ({ BackgroundColorToggle: () => null }));

const intent = (id, extra = {}) => ({ id, type: 'LIGAND', display: true, ...extra });
const observations = [
  { id: 1, code: 'first' },
  { id: 2, virtual_name: 'second' },
  { id: 3, code: 'third' }
];
const target = (id, name) => ({ moleculeId: id, name, OBJECT_TYPE: 'LIGAND', display_div: 'major_view' });

describe('ligand loading progress', () => {
  it('counts cached or inline coordinates independently of native rendering', () => {
    expect.hasAssertions();
    const coordinates = [
      { obsId: 1, ligandData: 'cached sdf' },
      { obsId: 3, ligandData: '' }
    ];
    const data = [observations[0], { ...observations[1], sdf_info: 'inline sdf' }, observations[2]];
    expect(getLigandLoadingProgress([intent(1), intent(2), intent(3)], coordinates, data)).toStrictEqual({
      total: 3,
      downloaded: 2,
      rendered: 0
    });
  });

  it('requires acknowledgement and a matching LHS object, excluding RHS objects and unfinished loads', () => {
    expect.hasAssertions();
    const objects = {
      first_LIGAND_9: target(1, 'first_LIGAND_9'),
      second_LIGAND: target(2, 'second_LIGAND'),
      third_LIGAND: target(3, 'third_LIGAND')
    };
    expect(
      getLigandLoadingProgress(
        [intent(1, { rendered: true }), intent(2), intent(3, { rendered: true })],
        [],
        observations,
        objects
      )
    ).toStrictEqual({ total: 3, downloaded: 1, rendered: 1 });
  });

  it('deduplicates overlaps with already rendered ligands and follows removal tombstones', () => {
    expect.hasAssertions();
    const objects = { first_LIGAND: target(1, 'first_LIGAND'), second_LIGAND: target(2, 'second_LIGAND') };
    const requested = [
      intent(1, { rendered: true }),
      intent(1),
      intent(2, { rendered: true }),
      intent(2, { display: false }),
      { id: 3, type: 'PROTEIN', display: true }
    ];
    expect(getLigandLoadingProgress(requested, [], observations, objects)).toStrictEqual({
      total: 1,
      downloaded: 1,
      rendered: 1
    });
    expect(getLigandLoadingProgress()).toStrictEqual({ total: 0, downloaded: 0, rendered: 0 });
  });

  it('updates between HITS and settings as coordinates, native acknowledgements and snapshot intent change', () => {
    expect.hasAssertions();
    const reducer = combineReducers({ selectionReducers, apiReducers, nglReducers, previewReducers });
    const initial = reducer(undefined, {});
    const store = legacy_createStore(reducer, {
      ...initial,
      apiReducers: { ...initial.apiReducers, all_mol_lists: observations },
      selectionReducers: { ...initial.selectionReducers, toBeDisplayedList: [intent(1), intent(2)] }
    });
    render(
      <Provider store={store}>
        <ThemeProvider theme={getTheme()}>
          <ViewerControls />
        </ThemeProvider>
      </Provider>
    );
    const counter = screen.getByTestId('ligand-loading-progress');
    expect(
      screen
        .getByRole('button', { name: 'Ligand loading settings' })
        .compareDocumentPosition(screen.getByTestId('ligand-action-timer')) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(
      screen.getByRole('button', { name: 'Hits' }).compareDocumentPosition(counter) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(
      counter.compareDocumentPosition(screen.getByRole('button', { name: 'Viewer settings' })) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(counter).toHaveAttribute('aria-label', 'Hit ligands: downloaded 0 of 2, rendered 0 of 2');
    act(() => {
      store.dispatch(appendLigandData(1, 'sdf'));
    });
    expect(counter).toHaveAttribute('aria-label', 'Hit ligands: downloaded 1 of 2, rendered 0 of 2');
    act(() => {
      store.dispatch(updateInToBeDisplayedList(intent(1, { rendered: true })));
    });
    expect(counter).toHaveAttribute('aria-label', 'Hit ligands: downloaded 1 of 2, rendered 0 of 2');
    act(() => {
      store.dispatch(loadNglObject(target(1, 'first_LIGAND'), []));
    });
    expect(counter).toHaveAttribute('aria-label', 'Hit ligands: downloaded 1 of 2, rendered 1 of 2');
    act(() => {
      store.dispatch(deleteNglObject(target(1, 'first_LIGAND')));
    });
    expect(counter).toHaveAttribute('aria-label', 'Hit ligands: downloaded 1 of 2, rendered 0 of 2');
    act(() => {
      store.dispatch(setToBeDisplayedList([intent(2)]));
    });
    expect(counter).toHaveAttribute('aria-label', 'Hit ligands: downloaded 0 of 1, rendered 0 of 1');
    act(() => {
      store.dispatch(setToBeDisplayedList([]));
    });
    expect(counter).toHaveAttribute('aria-label', 'Hit ligands: downloaded 0 of 0, rendered 0 of 0');
    expect(Object.keys(store.getState().selectionReducers)).toStrictEqual(Object.keys(initial.selectionReducers));
  });

  it('opens experiment presets beside the counters and applies validated custom settings without changing Redux', () => {
    expect.hasAssertions();
    setBulkLigandSettings(bulkLigandPreset('combined'));
    const store = legacy_createStore(combineReducers({ selectionReducers, apiReducers, nglReducers, previewReducers }));
    const initial = store.getState();
    render(
      <Provider store={store}>
        <ThemeProvider theme={getTheme()}>
          <ViewerControls />
        </ThemeProvider>
      </Provider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Ligand loading settings' }));
    expect(screen.getByRole('dialog', { name: 'Bulk ligand loading' })).toBeInTheDocument();
    [
      'Defer native Models UI until first opened',
      'Skip redundant opaque buffer updates',
      'Batch native buffer publication',
      'Coalesce native scene repaints',
      'Accelerate atom picking and sample hover per frame',
      'Batch bulk ligand Coot commands',
      'Low-detail bulk ligands'
    ].forEach(name => {
      expect(screen.getByRole('checkbox', { name })).not.toBeChecked();
      fireEvent.click(screen.getByRole('checkbox', { name }));
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(getBulkLigandSettings()).toStrictEqual(bulkLigandPreset('combined'));
    fireEvent.click(screen.getByRole('button', { name: 'Ligand loading settings' }));
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Preset' }));
    fireEvent.click(screen.getByRole('option', { name: 'Combined + native viewer experiments' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(getBulkLigandSettings()).toStrictEqual(bulkLigandPreset('native'));
    fireEvent.click(screen.getByRole('button', { name: 'Ligand loading settings' }));
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Preset' }));
    fireEvent.click(screen.getByRole('option', { name: 'Experiment 1: serial' }));
    expect(screen.getByRole('checkbox', { name: 'Batch request updates' })).not.toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(getBulkLigandSettings().strategy).toBe('serial');
    fireEvent.click(screen.getByRole('button', { name: 'Ligand loading settings' }));
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Loading strategy' }));
    fireEvent.click(screen.getByRole('option', { name: 'Pipeline: separate preparation and rendering' }));
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Coordinate preparation slots' }), {
      target: { value: '3' }
    });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Native rendering slots' }), { target: { value: '0' } });
    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Native rendering slots' }), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Batch request updates' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Coalesce completion repaints' }));
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Repaint fallback delay (ms)' }), {
      target: { value: '25' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(getBulkLigandSettings()).toStrictEqual({
      ...bulkLigandPreset('combined'),
      downloads: 3,
      renders: 1,
      drawMaxWaitMs: 25
    });
    fireEvent.click(screen.getByRole('button', { name: 'Ligand loading settings' }));
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Coordinate preparation slots' }), {
      target: { value: '7' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(getBulkLigandSettings().downloads).toBe(3);
    expect(store.getState()).toBe(initial);
    setBulkLigandSettings(bulkLigandPreset('combined'));
  });
});
