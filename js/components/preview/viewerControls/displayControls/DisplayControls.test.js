import React, { Profiler } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { legacy_createStore } from 'redux';
import { ThemeProvider } from '../../../../ui/styles';
import { getTheme } from '../../../../theme';
import { HeaderContext } from '../../../header/headerContext';
import { NglContext } from '../../../nglView/nglProvider';
import nglReducers from '../../../../reducers/ngl/nglReducers';
import DisplayControls from './index';
import { displayTreeRows } from './VirtualDisplayTree';

jest.mock('../../../nglView/nglProvider', () => ({ NglContext: require('react').createContext() }));
jest.mock('../../../nglView/redux/dispatchActions', () => ({ hideShapeRepresentations: jest.fn() }));
jest.mock('../../../../reducers/ngl/dispatchActions', () => ({
  deleteObject: target => ({ type: 'fixture/remove', target }),
  checkRemoveFromDensityList: () => ({ type: 'fixture/density' })
}));

const representation = (id, extra = {}) => ({
  uuid: `rep-${id}`,
  lastKnownID: id,
  type: 'ball+stick',
  params: { visible: true, opacity: 1 },
  templateParams: { opacity: { type: 'number', min: 0, max: 1 } },
  ...extra
});
const object = (name, extra = {}) => ({
  name,
  display_div: 'major_view',
  OBJECT_TYPE: 'LIGAND',
  selectionType: 'LIGAND',
  representations: [representation(name)],
  ...extra
});
const manyObjects = () =>
  Object.fromEntries(
    Array.from({ length: 930 }, (_, i) => {
      const key = `ligand-${String(i).padStart(4, '0')}`;
      return [key, object(key)];
    })
  );

const setup = (objects = {}, initialOpen = true) => {
  const actions = [];
  const store = legacy_createStore(
    (state = { nglReducers: { ...nglReducers(undefined, {}), objectsInView: objects } }, action) => {
      actions.push(action);
      if (action.type === 'fixture/objects')
        return { nglReducers: { ...state.nglReducers, objectsInView: action.objects } };
      if (action.type === 'fixture/remove') {
        const next = { ...state.nglReducers.objectsInView };
        delete next[action.target.name];
        return { nglReducers: { ...state.nglReducers, objectsInView: next } };
      }
      return { nglReducers: nglReducers(state.nglReducers, action) };
    }
  );
  const native = { params: { visible: true } };
  native.parentObject = { representations: [native] };
  const adapter = {
    getObject: jest.fn(() => native.parentObject),
    getRepresentation: jest.fn(() => native),
    getRepresentations: jest.fn(() => [native]),
    getRepresentationCount: jest.fn(() => 2),
    getVisibility: jest.fn(() => true),
    setVisibility: jest.fn(),
    removeRepresentation: jest.fn(),
    setRepresentationParameters: jest.fn(() => ({ ready: Promise.resolve() })),
    createRepresentation: jest.fn()
  };
  const getViewerAdapter = jest.fn(() => adapter);
  const commits = jest.fn();
  const view = open => (
    <Provider store={store}>
      <ThemeProvider theme={getTheme()}>
        <HeaderContext.Provider value={{ headerHeight: 0 }}>
          <NglContext.Provider value={{ getViewerAdapter }}>
            <Profiler id="display" onRender={commits}>
              <DisplayControls open={open} onClose={() => {}} />
            </Profiler>
          </NglContext.Provider>
        </HeaderContext.Provider>
      </ThemeProvider>
    </Provider>
  );
  const result = render(view(initialOpen));
  return {
    ...result,
    store,
    adapter,
    native,
    commits,
    getViewerAdapter,
    actions,
    setOpen: open => result.rerender(view(open)),
    setObjects: next =>
      act(() => {
        store.dispatch({ type: 'fixture/objects', objects: next });
      })
  };
};

describe('display controls', () => {
  it('does no tree or editor work for incoming objects while initially closed, then reads current data on open', () => {
    expect.hasAssertions();
    const test = setup({}, false);
    const before = test.commits.mock.calls.length;
    const objects = manyObjects();
    Object.entries(objects).forEach(([key, value]) =>
      test.setObjects({ ...test.store.getState().nglReducers.objectsInView, [key]: value })
    );
    expect(test.commits).toHaveBeenCalledTimes(before);
    expect(test.container.querySelectorAll('[role="treeitem"]')).toHaveLength(0);
    expect(test.getViewerAdapter).not.toHaveBeenCalled();

    test.setOpen(true);

    expect(screen.getByRole('treeitem', { name: 'ligand-0000' })).toBeInTheDocument();
    expect(screen.getAllByRole('treeitem').length).toBeLessThan(25);
    expect(screen.getByRole('treeitem', { name: 'ligand-0000' })).toHaveAttribute('aria-setsize', '930');
  });

  it('virtualizes scrolling and keyboard navigation across all 930 objects without losing expansion', () => {
    expect.hasAssertions();
    setup(manyObjects());
    const tree = screen.getByRole('tree');
    fireEvent.click(screen.getByRole('button', { name: 'Expand ligand-0000' }));
    expect(screen.getByRole('combobox', { name: 'Representation type for ligand-0000' })).toBeInTheDocument();
    fireEvent.keyDown(tree, { key: 'End' });
    const last = screen.getByRole('treeitem', { name: 'ligand-0929' });
    expect(tree).toHaveAttribute('aria-activedescendant', last.id);
    expect(screen.getAllByRole('treeitem').length).toBeLessThan(25);
    fireEvent.keyDown(tree, { key: 'ArrowRight' });
    fireEvent.keyDown(tree, { key: 'ArrowRight' });
    expect(tree).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('treeitem', { name: 'ligand-0929 ball+stick' }).id
    );
    fireEvent.keyDown(tree, { key: 'ArrowLeft' });
    expect(tree).toHaveAttribute('aria-activedescendant', last.id);
    fireEvent.keyDown(tree, { key: 'Home' });
    expect(screen.getByRole('button', { name: 'Collapse ligand-0000' })).toBeInTheDocument();
    fireEvent.scroll(tree, { target: { scrollTop: 4000 } });
    expect(screen.getByRole('treeitem', { name: 'ligand-0099' })).toBeInTheDocument();
    expect(screen.getAllByRole('treeitem').length).toBeLessThan(25);
  });

  it('retains expansion, selection and the scroll anchor while closed, resynchronizing additions and removals on open', () => {
    expect.hasAssertions();
    const objects = manyObjects();
    const test = setup(objects);
    const tree = screen.getByRole('tree');
    fireEvent.click(screen.getByRole('treeitem', { name: 'ligand-0000' }));
    fireEvent.scroll(tree, { target: { scrollTop: 4020 } });

    test.setOpen(false);

    const before = test.commits.mock.calls.length;
    const next = { ...objects, 'aaa-new': object('aaa-new') };
    delete next['ligand-0929'];

    test.setObjects(next);

    expect(test.commits).toHaveBeenCalledTimes(before);

    test.setOpen(true);

    expect(tree.scrollTop).toBe(4060);
    fireEvent.keyDown(tree, { key: 'Home' });
    expect(screen.getByRole('treeitem', { name: 'aaa-new' })).toBeInTheDocument();
    expect(screen.getByRole('treeitem', { name: 'ligand-0000' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: 'Collapse ligand-0000' })).toBeInTheDocument();
    fireEvent.keyDown(tree, { key: 'End' });
    expect(screen.queryByRole('treeitem', { name: 'ligand-0929' })).not.toBeInTheDocument();
    expect(screen.getByRole('treeitem', { name: 'ligand-0928' })).toBeInTheDocument();
  });

  it('pins an active editor anchor outside the window and keeps editor state across close/reopen', async () => {
    expect.hasAssertions();
    const objects = manyObjects();
    const test = setup(objects);
    const tree = screen.getByRole('tree');
    fireEvent.click(screen.getByRole('button', { name: 'Expand ligand-0000' }));
    const edit = screen.getByRole('button', { name: 'Edit ball+stick for ligand-0000' });
    // jsdom does not lay out the anchor; MUI requires a nonzero bounding box.
    edit.getBoundingClientRect = () => ({ top: 0, left: 0, right: 24, bottom: 24, width: 24, height: 24 });
    fireEvent.click(edit);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    const input = screen.getByRole('spinbutton');
    fireEvent.scroll(tree, { target: { scrollTop: 20000 } });
    expect(edit.isConnected).toBe(true);
    expect(screen.getAllByRole('treeitem', { hidden: true }).length).toBeLessThan(26);

    test.setOpen(false);

    const before = test.getViewerAdapter.mock.calls.length;

    test.setObjects({ ...objects, extra: object('extra') });

    expect(test.getViewerAdapter).toHaveBeenCalledTimes(before);

    test.setOpen(true);

    expect(screen.getByRole('spinbutton')).toBe(input);
    expect(edit.isConnected).toBe(true);

    // Removing the edited object while hidden must not leave a stale editor on reopen.
    test.setOpen(false);

    const next = { ...objects };
    delete next['ligand-0000'];

    test.setObjects(next);

    test.setOpen(true);

    await act(async () => {});
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    test.setObjects(objects);

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('retains an open colour picker and its Cancel colour through drawer suspension', async () => {
    expect.hasAssertions();
    const rep = representation('colour', {
      params: { visible: true, color: 255 },
      templateParams: { color: { type: 'color' } }
    });
    const test = setup({ ligand: object('ligand', { representations: [rep] }) });
    fireEvent.click(screen.getByRole('button', { name: 'Expand ligand' }));
    const edit = screen.getByRole('button', { name: 'Edit ball+stick for ligand' });
    const bounds = () => ({ top: 0, left: 0, right: 24, bottom: 24, width: 24, height: 24 });
    edit.getBoundingClientRect = bounds;
    fireEvent.click(edit);
    const swatch = screen.getByRole('menu').querySelector('.MuiBox-root');
    swatch.getBoundingClientRect = bounds;
    fireEvent.click(swatch);
    const cancel = screen.getByText('Cancel');
    expect(cancel).toBeVisible();

    test.setOpen(false);

    test.setObjects({ ligand: object('ligand', { representations: [rep] }), extra: object('extra') });

    test.setOpen(true);

    expect(screen.getByText('Cancel')).toBe(cancel);
    await act(async () => {
      fireEvent.click(cancel);
    });
    expect(test.adapter.setRepresentationParameters).toHaveBeenCalledWith(test.native, { color: 255 });
  });

  it('routes virtualized visibility and removal controls to the correct object and keeps protein protection', () => {
    expect.hasAssertions();
    const objects = manyObjects();
    objects['aaa-protein'] = object('aaa-protein', { OBJECT_TYPE: 'PROTEIN' });
    const test = setup(objects);
    expect(screen.getByRole('button', { name: 'Remove aaa-protein' })).toBeDisabled();
    const tree = screen.getByRole('tree');
    fireEvent.keyDown(tree, { key: 'End' });
    fireEvent.click(screen.getByRole('button', { name: 'Toggle ligand-0929' }));
    expect(test.adapter.setVisibility).toHaveBeenCalledWith(test.native, false);
    expect(test.actions.some(action => action.objectInViewID === 'ligand-0929')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Remove ligand-0929' }));
    expect(test.store.getState().nglReducers.objectsInView['ligand-0929']).toBeUndefined();
  });

  it('awaits native readiness for added representations and edits without storing circular native handles', async () => {
    expect.hasAssertions();
    const test = setup({ ligand: object('ligand') });
    let finish;
    const ready = new Promise(resolve => {
      finish = resolve;
    });
    const added = { ...representation('new', { type: 'axes' }), ready, nativeRepresentation: test.native };
    added.parentObject = { representations: [added] };

    test.adapter.createRepresentation.mockReturnValue(added);

    fireEvent.click(screen.getByRole('button', { name: 'Add representation to ligand' }));
    expect(test.store.getState().nglReducers.objectsInView.ligand.representations).toHaveLength(1);
    await act(async () => {
      finish();
      await ready;
    });
    const stored = test.store.getState().nglReducers.objectsInView.ligand.representations;
    expect(stored).toHaveLength(2);
    expect(stored[1]).not.toHaveProperty('parentObject');
    expect(stored[1]).not.toHaveProperty('nativeRepresentation');
    fireEvent.click(screen.getByRole('button', { name: 'Expand ligand' }));
    const edit = screen.getByRole('button', { name: 'Edit ball+stick for ligand' });
    edit.getBoundingClientRect = () => ({ top: 0, left: 0, right: 24, bottom: 24, width: 24, height: 24 });
    fireEvent.click(edit);
    let finishEdit;
    const editReady = new Promise(resolve => {
      finishEdit = resolve;
    });

    test.adapter.setRepresentationParameters.mockReturnValue({ ready: editReady });

    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '0.5' } });
    expect(test.adapter.setRepresentationParameters).toHaveBeenCalledWith(test.native, { opacity: '0.5' });
    expect(stored[0].params.opacity).toBe(1);
    await act(async () => {
      finishEdit();
      await editReady;
    });
    expect(test.store.getState().nglReducers.objectsInView.ligand.representations[0].params.opacity).toBe('0.5');
  });

  it('sorts detached rows without mutating Redux arrays and excludes vectors and secondary views', () => {
    expect.hasAssertions();
    const representations = Object.freeze([representation(2), representation(1)]);
    const objects = {
      ligand: object('ligand', { representations }),
      vector: object('vector', { selectionType: 'VECTOR' }),
      secondary: object('secondary', { display_div: 'secondary_view' })
    };
    const rows = displayTreeRows(objects, new Set([JSON.stringify(['object', 'ligand'])]));
    expect(rows.map(row => row.label)).toStrictEqual(['ligand', 'ligand ball+stick', 'ligand ball+stick']);
    expect(rows[1].representation.lastKnownID).toBe(1);
    expect(representations[0].lastKnownID).toBe(2);
  });
});
