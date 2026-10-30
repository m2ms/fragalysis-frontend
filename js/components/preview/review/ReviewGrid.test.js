import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from '../../../ui/styles';
import { getTheme } from '../../../theme';
import { ReviewGrid } from './ReviewGrid';

const items = Array.from({ length: 10000 }, (_value, id) => ({ id, label: `v${id}` }));
const themedGrid = (data, renderImage) => (
  <ThemeProvider theme={getTheme()}>
    <ReviewGrid items={data} renderImage={renderImage} />
  </ThemeProvider>
);

const withViewport = check => {
  let width = 640;
  let height = 448;
  const observers = [];
  const originalObserver = global.ResizeObserver;
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
  const bounds = jest
    .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
    .mockImplementation(() => ({ width, height }));
  const resize = (nextWidth, nextHeight) => {
    width = nextWidth;
    height = nextHeight;
    act(() => observers.filter(observer => observer.node).forEach(observer => observer.notify()));
  };
  try {
    check({ resize, observers });
  } finally {
    cleanup();
    bounds.mockRestore();
    global.ResizeObserver = originalObserver;
  }
};
const labels = () => screen.getAllByRole('listitem').map(item => item.getAttribute('aria-label'));

describe('responsive virtual review grid', () => {
  it('mounts only nearby rows and makes the entire logical result accessible by scrolling', () => {
    expect.hasAssertions();
    withViewport(() => {
      const renderImage = jest.fn(item => <span>Image {item.label}</span>);
      render(themedGrid(items, renderImage));
      const viewport = screen.getByRole('region', { name: 'Review thumbnails' });
      expect(labels()).toStrictEqual(['v0', 'v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8']);
      expect(renderImage).toHaveBeenCalledTimes(9);
      expect(screen.queryByText('Image v100')).not.toBeInTheDocument();
      fireEvent.scroll(viewport, { target: { scrollTop: 26000 } });
      expect(screen.queryByText('Image v0')).not.toBeInTheDocument();
      expect(screen.getByRole('listitem', { name: 'v300', exact: true })).toHaveAttribute('aria-posinset', '301');
      expect(screen.getAllByRole('listitem')).toHaveLength(12);
      expect(screen.getAllByRole('listitem')[0]).toHaveAttribute('aria-setsize', '10000');
      const totalHeight = Number.parseFloat(screen.getByRole('list').style.height);
      fireEvent.scroll(viewport, { target: { scrollTop: totalHeight - 448 } });
      expect(screen.getByRole('listitem', { name: 'v9999', exact: true })).toBeInTheDocument();
      expect(screen.getAllByRole('listitem').length).toBeLessThanOrEqual(12);
      fireEvent.scroll(viewport, { target: { scrollTop: 0 } });
      expect(labels()[0]).toBe('v0');
      expect(screen.queryByRole('button', { name: 'Show more observations' })).not.toBeInTheDocument();
    });
  });

  it('reflows on width/height changes, including a viewport narrower than one card', () => {
    expect.hasAssertions();
    withViewport(({ resize }) => {
      render(themedGrid(items, () => null));
      resize(850, 672);
      expect(screen.getAllByRole('listitem')).toHaveLength(16);
      expect(screen.getByRole('presentation').style.gridTemplateColumns).toBe('repeat(4, minmax(0, 200px))');
      resize(150, 224);
      expect(labels()).toStrictEqual(['v0', 'v1']);
      expect(screen.getByRole('presentation').style.gridTemplateColumns).toBe('repeat(1, minmax(0, 200px))');
      resize(640, 448);
      expect(labels()).toHaveLength(9);
    });
  });

  it('resets scrolling after filtering/reordering, but retains it for an unchanged logical result', () => {
    expect.hasAssertions();
    withViewport(({ observers }) => {
      const image = () => null;
      const view = render(themedGrid(items, image));
      const viewport = screen.getByRole('region', { name: 'Review thumbnails' });
      fireEvent.scroll(viewport, { target: { scrollTop: 22400 } });
      const before = labels();
      view.rerender(themedGrid([...items], image));
      expect(labels()).toStrictEqual(before);
      expect(viewport.scrollTop).toBe(22400);
      view.rerender(themedGrid([items[9000], items[2]], image));
      expect(labels()).toStrictEqual(['v9000', 'v2']);
      expect(viewport.scrollTop).toBe(0);
      view.rerender(themedGrid([items[2], items[9000]], image));
      expect(labels()).toStrictEqual(['v2', 'v9000']);
      view.unmount();
      expect(observers.every(observer => !observer.node)).toBe(true);
      act(() => observers.forEach(observer => observer.notify()));
    });
  });
});
