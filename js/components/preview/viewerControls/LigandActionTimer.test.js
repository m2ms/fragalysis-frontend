import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { LigandActionTimer, formatLigandActionTime } from './LigandActionTimer';
import {
  beginLigandActionTiming,
  bindLigandActionIntents,
  cancelLigandActionTiming,
  publishLigandActionTiming,
  trackLigandActionOperation
} from '../../../reducers/ngl/ligandActionTiming';
import { markMoleculeInputError } from '../../../viewer/moleculeInputErrors';

jest.mock('../../tooltip/RichTooltip', () => ({ __esModule: true, default: ({ children }) => children }));

describe('ligand stopwatch', () => {
  // eslint-disable-next-line jest/no-hooks
  beforeEach(() => {
    jest.useFakeTimers();
  });

  // eslint-disable-next-line jest/no-hooks
  afterEach(() => {
    cleanup();
    cancelLigandActionTiming();
    jest.useRealTimers();
  });

  it('updates while running, retains the result and clears its interval on completion and unmount', async () => {
    expect.hasAssertions();
    const item = { id: 1, type: 'LIGAND', display: true };
    const state = { selectionReducers: { toBeDisplayedList: [item] }, nglReducers: { objectsInView: {} } };
    const view = render(
      <React.StrictMode>
        <LigandActionTimer />
      </React.StrictMode>
    );
    let finish;
    const pending = new Promise(resolve => {
      finish = resolve;
    });
    act(() => {
      const timing = beginLigandActionTiming('load', [{ id: 1, code: 'test' }], () => state);
      bindLigandActionIntents(timing, [item]);
      trackLigandActionOperation(item, pending);
      publishLigandActionTiming(timing);
    });
    act(() => {
      jest.advanceTimersByTime(1250);
    });
    const timer = screen.getByTestId('ligand-action-timer');
    expect(timer).toHaveAttribute('data-status', 'running');
    expect(timer).toHaveTextContent('1.2s');
    await act(async () => {
      state.selectionReducers.toBeDisplayedList = [{ ...item, rendered: true }];
      state.nglReducers.objectsInView.test_LIGAND = { OBJECT_TYPE: 'LIGAND', moleculeId: 1 };
      finish('rendered');
    });
    expect(timer).toHaveAttribute('data-status', 'completed');
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(timer).toHaveTextContent('1.2s');
    view.unmount();
    jest.runAllTicks();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('releases its live update interval when unmounted during an action', () => {
    expect.hasAssertions();
    const item = { id: 2, type: 'LIGAND', display: true };
    const state = { selectionReducers: { toBeDisplayedList: [item] }, nglReducers: { objectsInView: {} } };
    const view = render(
      <React.StrictMode>
        <LigandActionTimer />
      </React.StrictMode>
    );
    act(() => {
      const timing = beginLigandActionTiming('load', [{ id: 2, code: 'pending' }], () => state);
      bindLigandActionIntents(timing, [item]);
      publishLigandActionTiming(timing);
    });
    expect(screen.getByTestId('ligand-action-timer')).toHaveAttribute('data-status', 'running');
    view.unmount();
    jest.runAllTicks();
    expect(jest.getTimerCount()).toBe(0);
  });

  it.each([1, 3])('shows %i skipped inputs without labeling a completed render as Failed', async count => {
    expect.hasAssertions();
    const items = Array.from({ length: count }, (_, index) => ({ id: index + 1, type: 'LIGAND', display: true }));
    const state = { selectionReducers: { toBeDisplayedList: items }, nglReducers: { objectsInView: {} } };
    const view = render(<LigandActionTimer />);
    let operations;
    act(() => {
      const timing = beginLigandActionTiming(
        'load',
        items.map(item => ({ id: item.id, code: `test-${item.id}` })),
        () => state
      );
      bindLigandActionIntents(timing, items);
      operations = items.map(item => {
        let reject;
        const promise = new Promise((resolve, fail) => {
          reject = fail;
        });
        trackLigandActionOperation(item, promise);
        return { promise, reject };
      });
      publishLigandActionTiming(timing);
      jest.advanceTimersByTime(1250);
    });
    await act(async () => {
      state.selectionReducers.toBeDisplayedList = [];
      operations.forEach(operation => operation.reject(markMoleculeInputError(new Error('bad MOL'))));
      await Promise.allSettled(operations.map(operation => operation.promise));
    });
    const timer = screen.getByTestId('ligand-action-timer');
    const skippedLabel = `${count} ${count === 1 ? 'ligand' : 'ligands'} skipped`;
    expect(timer).toHaveAttribute('data-status', 'completed');
    expect(timer).toHaveTextContent(skippedLabel);
    expect(timer).toHaveAttribute('aria-label', `Ligand load: completed, elapsed 1.2s, ${skippedLabel}`);
    expect(timer).not.toHaveTextContent('Failed');
    view.unmount();
    jest.runAllTicks();
    expect(jest.getTimerCount()).toBe(0);
  });

  it.each([
    [0, '0.0s'],
    [59999, '59.9s'],
    [62345, '1:02.3'],
    [3600000, '60:00.0']
  ])('formats %i milliseconds as %s', (duration, expected) => {
    expect.hasAssertions();
    expect(formatLigandActionTime(duration)).toBe(expected);
  });
});
