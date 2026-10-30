import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { ThemeProvider } from '../../../ui/styles';
import { getTheme } from '../../../theme';
import { ReviewWorkspace } from './ReviewWorkspace';
import { ReviewButton } from './ReviewButton';
import { Provider } from 'react-redux';
import { legacy_createStore, combineReducers } from 'redux';
import { selectionReducers } from '../../../reducers/selection/selectionReducers';
import { reloadSelectionReducer } from '../../../reducers/selection/actions';
import { normalizeReviewSettings } from '../../../constants/reviewSettings';
import { ReviewDesignDbAction } from './ReviewDesignDbAction';

jest.mock('../../../utils/djangoContext', () => ({ DJANGO_CONTEXT: { pk: 7 } }));

const panels = {
  rhs: {
    title: 'Design review',
    content: (
      <>
        <p>RHS content</p>
        <ReviewDesignDbAction />
      </>
    )
  },
  lhs: { title: 'Hit review', content: <p>LHS content</p> }
};

const setup = (disabled = false, includeLhs = false) => {
  const previousObserver = global.ResizeObserver;
  const observers = [];
  class TestResizeObserver {
    constructor(notify) {
      this.notify = notify;
      observers.push(this);
    }
    observe(node) {
      this.node = node;
    }
    disconnect() {
      this.node = null;
    }
  }
  const observe = jest.spyOn(TestResizeObserver.prototype, 'observe');
  const disconnect = jest.spyOn(TestResizeObserver.prototype, 'disconnect');
  global.ResizeObserver = TestResizeObserver;
  const store = legacy_createStore(combineReducers({ selectionReducers }));
  const view = render(
    <Provider store={store}>
      <ThemeProvider theme={getTheme()}>
        <ReviewWorkspace panels={panels}>
          <div data-testid="navigator">
            <ReviewButton side="rhs" disabled={disabled} />
          </div>
          {includeLhs && <ReviewButton side="lhs" />}
        </ReviewWorkspace>
      </ThemeProvider>
    </Provider>
  );
  const root = observe.mock.calls[0][0];
  let height = 800;
  root.getBoundingClientRect = () => ({ height, bottom: height });
  act(() => observers[0].notify());
  return {
    ...view,
    store,
    observer: observers[0],
    disconnect,
    cleanup: () => {
      view.unmount();
      global.ResizeObserver = previousObserver;
      observe.mockRestore();
      disconnect.mockRestore();
    },
    setAvailableHeight: next => {
      height = next;
      act(() => observers[0].notify());
    }
  };
};

describe('review workspace', () => {
  it('restores panel ownership, height and ordering without remounting the upper workspace, and defaults old snapshots', () => {
    expect.hasAssertions();
    const view = setup(false, true);
    try {
      const navigator = screen.getByTestId('navigator');
      act(() =>
        view.store.dispatch(
          reloadSelectionReducer({
            review: {
              owner: 'rhs',
              open: true,
              height: 430,
              orderingBySide: { rhs: { sortOption: 'COMPOUND_CODE', ascending: false } }
            }
          })
        )
      );
      expect(screen.getByRole('region', { name: 'Design review' }).parentElement.style.height).toBe('430px');
      expect(view.store.getState().selectionReducers.review.orderingBySide.rhs.ascending).toBe(false);
      fireEvent.click(screen.getByRole('button', { name: 'Push to DesignDB' }));
      expect(screen.getByRole('dialog', { name: 'WARNING! Coming soon' })).toBeInTheDocument();
      act(() => view.store.dispatch(reloadSelectionReducer(view.store.getState().selectionReducers)));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Close review panel' }));
      expect(view.store.getState().selectionReducers.review).toMatchObject({ owner: 'rhs', open: false, height: 430 });
      act(() => view.store.dispatch(reloadSelectionReducer({ review: { owner: 'lhs', open: true, height: 400 } })));
      expect(screen.getByRole('region', { name: 'Hit review' })).toBeVisible();
      expect(screen.getByTestId('navigator')).toBe(navigator);
      act(() => view.store.dispatch(reloadSelectionReducer({})));
      expect(screen.queryByRole('region')).not.toBeInTheDocument();
      expect(view.store.getState().selectionReducers.review).toStrictEqual(normalizeReviewSettings());
      fireEvent.click(screen.getAllByRole('button', { name: 'Review', exact: true })[0]);
      expect(screen.getByRole('region', { name: 'Design review' }).parentElement.style.height).toBe('376px');
      expect(screen.getByTestId('navigator')).toBe(navigator);
    } finally {
      view.cleanup();
    }
  });

  it('retains the resized height across both closing actions and clamps temporary smaller workspaces', () => {
    expect.hasAssertions();
    const view = setup();
    try {
      const button = screen.getByRole('button', { name: 'Review' });
      const navigator = screen.getByTestId('navigator');
      const panelHeight = () => screen.getByRole('region', { name: 'Design review' }).parentElement.style.height;
      expect(button).toHaveAttribute('aria-expanded', 'false');
      fireEvent.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'true');
      expect(panelHeight()).toBe('376px');
      const divider = screen.getByRole('separator');
      fireEvent.mouseDown(divider, { button: 0 });
      fireEvent.mouseMove(window, { clientY: 450 });
      fireEvent.mouseUp(window);
      expect(panelHeight()).toBe('340px');
      fireEvent.click(screen.getByRole('button', { name: 'Close review panel' }));
      expect(screen.queryByRole('region')).not.toBeInTheDocument();
      fireEvent.click(button);
      expect(panelHeight()).toBe('340px');
      fireEvent.click(button);
      expect(screen.queryByRole('region')).not.toBeInTheDocument();
      fireEvent.click(button);
      view.setAvailableHeight(400);
      expect(panelHeight()).toBe('180px');
      view.setAvailableHeight(800);
      expect(panelHeight()).toBe('340px');
      expect(screen.getByTestId('navigator')).toBe(navigator);

      fireEvent.mouseDown(screen.getByRole('separator'), { button: 0 });
      fireEvent.mouseMove(window, { clientY: -1000 });
      fireEvent.mouseUp(window);
      expect(panelHeight()).toBe('540px');
      fireEvent.mouseDown(screen.getByRole('separator'), { button: 0 });
      fireEvent.mouseMove(window, { clientY: 1000 });
      fireEvent.mouseUp(window);
      expect(panelHeight()).toBe('160px');
      view.unmount();
      expect(view.disconnect).toHaveBeenCalledTimes(1);
      act(() => view.observer.notify());
    } finally {
      view.cleanup();
    }
  });

  it('shows a disabled Review button for an empty result without enabling a panel', () => {
    expect.hasAssertions();
    const view = setup(true);
    try {
      const button = screen.getByRole('button', { name: 'Review' });
      expect(button).toBeDisabled();
      fireEvent.click(button);
      expect(screen.queryByRole('region')).not.toBeInTheDocument();
    } finally {
      view.cleanup();
    }
  });

  it('replaces the active side through injected controls without enabling production LHS UI', () => {
    expect.hasAssertions();
    const view = setup(false, true);
    try {
      const buttons = screen.getAllByRole('button', { name: 'Review' });
      fireEvent.click(buttons[0]);
      expect(screen.getByRole('region', { name: 'Design review' })).toHaveTextContent('RHS content');
      fireEvent.click(buttons[1]);
      expect(screen.queryByRole('region', { name: 'Design review' })).not.toBeInTheDocument();
      expect(within(screen.getByRole('region', { name: 'Hit review' })).getByText('LHS content')).toBeInTheDocument();
      expect(buttons[0]).toHaveAttribute('aria-expanded', 'false');
      expect(buttons[1]).toHaveAttribute('aria-expanded', 'true');
    } finally {
      view.cleanup();
    }
  });
});
