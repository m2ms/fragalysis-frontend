import { layouts } from './index';
import { layoutItemNames } from '../constants';

describe('available upper workspace height with Review open', () => {
  it.each(Object.entries(layouts))(
    'fits %s to the remaining space and preserves its closed-panel minimum',
    (_name, layout) => {
      expect.hasAssertions();
      const args = [true, true, false, 390, 8, true, {}];
      const before = layout.createLayout(...args);
      const open = layout.createLayout(...args, true);
      const closed = layout.createLayout(...args, false);
      expect(closed).toStrictEqual(before);
      Object.keys(open).forEach(breakpoint => {
        const viewerItem = items =>
          items.find(item => [layoutItemNames.NGL, layoutItemNames.RESIZABLE].includes(item.i));
        expect(viewerItem(open[breakpoint]).h).toBeLessThan(viewerItem(closed[breakpoint]).h);
        open[breakpoint].forEach(item => {
          expect(item.h).toBeGreaterThan(0);
          // ReactGridLayout uses one pixel rows with eight pixel gaps and outside margins.
          expect((item.y + item.h) * 9 + 8).toBeLessThanOrEqual(390);
        });
      });
    }
  );
});
