import React from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { applyMiddleware, combineReducers, legacy_createStore } from 'redux';
import { thunk } from 'redux-thunk';
import { ThemeProvider } from '../../ui/styles';
import { getTheme } from '../../theme';
import { layoutReducers } from '../../reducers/layout/layoutReducers';
import { selectionReducers } from '../../reducers/selection/selectionReducers';
import { ReviewWorkspace } from './review/ReviewWorkspace';
import { ReviewButton } from './review/ReviewButton';
import { useUpdateGridLayout } from './useUpdateGridLayout';

const UpperGrid = () => {
  const ref = useUpdateGridLayout(false);
  return (
    <div ref={ref} data-testid="upper-grid">
      <ReviewButton side="rhs" />
    </div>
  );
};

describe('review-aware upper layout', () => {
  it('recalculates the upper grid at its measured height when Review opens and restores the existing minimum on close', () => {
    expect.hasAssertions();
    const previousObserver = global.ResizeObserver;
    const observers = [];
    global.ResizeObserver = class {
      constructor(notify) {
        this.notify = notify;
        observers.push(this);
      }
      observe(node) {
        this.node = node;
      }
      unobserve() {
        this.node = null;
      }
      disconnect() {
        this.node = null;
      }
    };
    const previewState = { viewerControls: { sidesOpen: { LHS: true, RHS: true } } };
    const store = legacy_createStore(
      combineReducers({
        layoutReducers,
        selectionReducers,
        previewReducers: (state = previewState) => state
      }),
      applyMiddleware(thunk)
    );
    let view;
    try {
      view = render(
        <Provider store={store}>
          <ThemeProvider theme={getTheme()}>
            <ReviewWorkspace panels={{ rhs: { title: 'Design review', content: null } }}>
              <UpperGrid />
            </ReviewWorkspace>
          </ThemeProvider>
        </Provider>
      );
      const grid = view.getByTestId('upper-grid');
      const observer = observers.find(item => item.node === grid);
      act(() => observer.notify([{ borderBoxSize: [{ blockSize: 390 }] }]));
      expect(store.getState().layoutReducers.currentLayout.lg[0].h).toBe(60);
      fireEvent.click(view.getByRole('button', { name: 'Review' }));
      const rowCount = store.getState().layoutReducers.currentLayout.lg[0].h;
      expect(rowCount * 9 + 8).toBeLessThanOrEqual(390);
      expect(view.getByTestId('upper-grid')).toBe(grid);
      fireEvent.click(view.getByRole('button', { name: 'Close review panel' }));
      expect(store.getState().layoutReducers.currentLayout.lg[0].h).toBe(60);
    } finally {
      view?.unmount();
      global.ResizeObserver = previousObserver;
    }
  });
});
