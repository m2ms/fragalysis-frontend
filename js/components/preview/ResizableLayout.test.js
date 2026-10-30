import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { legacy_createStore } from 'redux';
import { createHtmlPortalNode, InPortal } from 'react-reverse-portal';
import { ThemeProvider } from '../../ui/styles';
import { getTheme } from '../../theme';
import { ResizableLayout } from './ResizableLayout';

jest.mock('../snapshot/snapshotList', () => ({ expanded, expandHandler }) => (
  <button data-testid="snapshots" onClick={() => expandHandler(!expanded)}>
    Toggle snapshots
  </button>
));
jest.mock('./tags/details/tagDetailsLHS', () => ({
  TagDetailsLHS: ({ expandHandler }) => (
    <div data-testid="lhs-tags">
      <button onClick={() => expandHandler(false)}>Collapse LHS tags</button>
      <button onClick={() => expandHandler(true)}>Expand LHS tags</button>
    </div>
  )
}));
jest.mock('./tags/details/tagDetailsRHS', () => ({
  TagDetailsRHS: ({ expandHandler }) => (
    <div data-testid="rhs-tags">
      <button onClick={() => expandHandler(false)}>Collapse RHS tags</button>
      <button onClick={() => expandHandler(true)}>Expand RHS tags</button>
    </div>
  )
}));
jest.mock('./molecule/hitNavigator', () => () => <div data-testid="lhs-navigator" />);
jest.mock('./molecule/poseListRHS', () => ({
  PoseListRHS: ({ expandHandler }) => (
    <div data-testid="rhs-navigator">
      <button onClick={() => expandHandler(false)}>Collapse RHS navigator</button>
      <button onClick={() => expandHandler(true)}>Expand RHS navigator</button>
    </div>
  )
}));
jest.mock('./plotly/plotlyView', () => ({ PlotlyView: () => <div data-testid="graphs" /> }));
jest.mock('./viewerControls', () => ({ ViewerControls: () => null }));

const setup = () => {
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
    disconnect() {
      this.node = null;
    }
  };
  let height = 1000;
  const node = document.createElement('div');
  node.getBoundingClientRect = () => ({ height, y: 0, x: 0, right: 2000, width: 2000 });
  const gridRef = { current: { elementRef: { current: { firstChild: node } } } };
  const state = { previewReducers: { viewerControls: { sidesOpen: { LHS: true, RHS: true } } } };
  const store = legacy_createStore((current = state) => current);
  const portal = createHtmlPortalNode();
  const view = render(
    <Provider store={store}>
      <ThemeProvider theme={getTheme()}>
        <ResizableLayout gridRef={gridRef} nglPortal={portal} />
        <InPortal node={portal}>
          <canvas data-testid="retained-viewer" />
        </InPortal>
      </ThemeProvider>
    </Provider>
  );
  const resize = value => {
    height = value;
    act(() => observers.filter(observer => observer.node === node).forEach(observer => observer.notify()));
  };
  const panelHeight = id => Number.parseFloat(screen.getByTestId(id).parentElement.style.height);
  const totalHeight = side =>
    (side === 'lhs' ? ['snapshots', 'lhs-tags', 'lhs-navigator'] : ['graphs', 'rhs-tags', 'rhs-navigator']).reduce(
      (sum, id) => sum + panelHeight(id),
      40
    );
  resize(height);
  return {
    ...view,
    resize,
    panelHeight,
    totalHeight,
    cleanup: () => {
      view.unmount();
      global.ResizeObserver = previousObserver;
    }
  };
};

describe('side panel heights after closing a maximized Review panel', () => {
  it('fills the recovered space on both sides across repeated minimum-height and full-height cycles', () => {
    expect.hasAssertions();
    const view = setup();
    try {
      const canvas = screen.getByTestId('retained-viewer');
      for (const height of [220, 1000, 220, 1000, 220, 1000]) {
        view.resize(height);
        expect(view.panelHeight('snapshots')).toBe(25);
        expect(view.totalHeight('lhs')).toBeCloseTo(height, 5);
        expect(view.totalHeight('rhs')).toBeCloseTo(height, 5);
        expect(view.panelHeight('lhs-navigator')).toBeGreaterThanOrEqual(120);
        expect(screen.getByTestId('retained-viewer')).toBe(canvas);
      }
    } finally {
      view.cleanup();
    }
  });

  it('keeps a collapsed RHS navigator fixed at its header height during container resizing', () => {
    expect.hasAssertions();
    const view = setup();
    try {
      fireEvent.click(screen.getByRole('button', { name: 'Collapse RHS navigator' }));
      for (const height of [220, 1000, 600, 1000]) {
        view.resize(height);
        expect(view.panelHeight('rhs-navigator')).toBe(25);
        expect(view.totalHeight('rhs')).toBeCloseTo(height, 5);
      }
      fireEvent.click(screen.getByRole('button', { name: 'Expand RHS navigator' }));
      expect(view.panelHeight('rhs-navigator')).toBeGreaterThanOrEqual(120);
      expect(view.totalHeight('rhs')).toBeCloseTo(1000, 5);
    } finally {
      view.cleanup();
    }
  });

  it('retains user-set variable proportions and restores a collapsed tag panel', () => {
    expect.hasAssertions();
    const view = setup();
    try {
      const lhs = screen.getByTestId('lhs-navigator').parentElement.parentElement;
      const divider = within(lhs).getAllByRole('separator')[1];
      fireEvent.mouseDown(divider, { button: 0 });
      fireEvent.mouseMove(window, { clientY: 500 });
      fireEvent.mouseUp(window);
      const ratio = view.panelHeight('lhs-tags') / view.panelHeight('lhs-navigator');
      for (const height of [700, 1000]) {
        view.resize(height);
        expect(view.panelHeight('lhs-tags') / view.panelHeight('lhs-navigator')).toBeCloseTo(ratio, 5);
        expect(view.totalHeight('lhs')).toBeCloseTo(height, 5);
      }
      const tagsHeight = view.panelHeight('lhs-tags');
      fireEvent.click(screen.getByRole('button', { name: 'Collapse LHS tags' }));
      expect(view.panelHeight('lhs-tags')).toBe(25);
      expect(view.totalHeight('lhs')).toBeCloseTo(1000, 5);
      fireEvent.click(screen.getByRole('button', { name: 'Expand LHS tags' }));
      expect(view.panelHeight('lhs-tags')).toBeCloseTo(tagsHeight, 5);
      expect(view.totalHeight('lhs')).toBeCloseTo(1000, 5);
    } finally {
      view.cleanup();
    }
  });
});
