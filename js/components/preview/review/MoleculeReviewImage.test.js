import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { applyMiddleware, legacy_createStore } from 'redux';
import { thunk } from 'redux-thunk';
import { ThemeProvider } from '../../../ui/styles';
import { getTheme } from '../../../theme';
import { selectionReducers } from '../../../reducers/selection/selectionReducers';
import { generateAndStoreMolImage } from '../molecule/redux/dispatchActions';
import * as imageActions from '../molecule/redux/dispatchActions';
import { MoleculeReviewImage } from './MoleculeReviewImage';
import { getReviewImage } from './reviewImageCache';

const toolkit = { get_mol: () => null };
jest.mock('../../rdkit/RDKitContext', () => ({ useRDKit: () => ({ RDKitModule: toolkit, loading: false }) }));

const imageView = (store, id = 501) => (
  <Provider store={store}>
    <ThemeProvider theme={getTheme()}>
      <MoleculeReviewImage observation={{ id, smiles: 'CC' }} label={`v${id}`} />
    </ThemeProvider>
  </Provider>
);
const imageStore = (query = '', cached = {}) => {
  const state = {
    apiReducers: { target_on: 1 },
    previewReducers: { molecule: { imageCache: cached } },
    selectionReducers: {
      ...selectionReducers(undefined, {}),
      unifiedFilter: { rhs: { filters: { molecule: { smiles: query } }, sortings: {} } }
    }
  };
  return legacy_createStore(
    (current = state, action) =>
      action.type === 'CHANGE_IMAGE_INPUT'
        ? {
            ...current,
            apiReducers: { target_on: action.target },
            selectionReducers: { ...current.selectionReducers, unifiedFilter: { rhs: { filters: { molecule: { smiles: action.query } }, sortings: {} } } }
          }
        : current,
    applyMiddleware(thunk)
  );
};

const withImageWork = async check => {
  const originalIdle = window.requestIdleCallback;
  const originalCancel = window.cancelIdleCallback;
  const jobs = new Map();
  let nextJob = 0;
  window.requestIdleCallback = callback => {
    jobs.set(++nextJob, callback);
    return nextJob;
  };
  window.cancelIdleCallback = id => jobs.delete(id);
  const generate = jest.spyOn(imageActions, 'generateAndStoreMolImage');
  const runJobs = async () => {
    await act(async () => {
      const pending = [...jobs.values()];
      jobs.clear();
      pending.forEach(callback => callback());
    });
  };
  try {
    await check({ generate, jobs, runJobs });
  } finally {
    cleanup();
    generate.mockRestore();
    if (originalIdle) window.requestIdleCallback = originalIdle;
    else delete window.requestIdleCallback;
    if (originalCancel) window.cancelIdleCallback = originalCancel;
    else delete window.cancelIdleCallback;
  }
};

describe('deferred review image work', () => {
  it('cancels deferred generation when an offscreen card or the panel is unmounted', async () => {
    expect.hasAssertions();
    await withImageWork(async ({ generate, jobs }) => {
      const view = render(imageView(imageStore(), 501));
      expect(generate).not.toHaveBeenCalled();
      expect(jobs.size).toBe(1);
      const staleCallback = [...jobs.values()][0];
      view.unmount();
      expect(jobs.size).toBe(0);
      await act(async () => staleCallback());
      expect(generate).not.toHaveBeenCalled();
    });
  });

  it('uses the existing base SVG cache without scheduling RDKit work', async () => {
    expect.hasAssertions();
    await withImageWork(({ generate, jobs }) => {
      const svg = '<svg xmlns="http://www.w3.org/2000/svg"><text>cached</text></svg>';
      render(imageView(imageStore('', { 502: svg }), 502));
      expect(screen.getByRole('img', { name: 'Molecule v502' })).toHaveAttribute(
        'src',
        `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
      );
      expect(jobs.size).toBe(0);
      expect(generate).not.toHaveBeenCalled();
    });
  });

  it('reuses highlighted results on remount and generates a distinct result for a new query', async () => {
    expect.hasAssertions();
    await withImageWork(async ({ generate, runJobs }) => {
      generate.mockImplementation(() => () => Promise.resolve('<svg>highlight</svg>'));
      const store = imageStore('C');
      const view = render(imageView(store, 503));
      await runJobs();
      expect(generate).toHaveBeenCalledTimes(1);
      view.unmount();
      const reopened = render(imageView(store, 503));
      await runJobs();
      expect(screen.getByRole('img', { name: 'Molecule v503' })).toBeInTheDocument();
      expect(generate).toHaveBeenCalledTimes(1);
      act(() => store.dispatch({ type: 'CHANGE_IMAGE_INPUT', target: 1, query: 'N' }));
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
      await runJobs();
      expect(generate).toHaveBeenCalledTimes(2);
      reopened.unmount();
    });
  });

  it('ignores pending completions after target/query changes and after closing the panel', async () => {
    expect.hasAssertions();
    await withImageWork(async ({ generate, runJobs }) => {
      const pending = [];
      generate.mockImplementation(() => () => new Promise(resolve => pending.push(resolve)));
      const store = imageStore('C');
      const view = render(imageView(store, 504));
      await runJobs();
      act(() => store.dispatch({ type: 'CHANGE_IMAGE_INPUT', target: 2, query: 'N' }));
      await runJobs();
      await act(async () => pending[0]('<svg>stale</svg>'));
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
      expect(getReviewImage(JSON.stringify([1, 504, 'CC', 'C']))).toBeUndefined();
      await act(async () => pending[1]('<svg>current</svg>'));
      expect(screen.getByRole('img')).toHaveAttribute(
        'src',
        `data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg>current</svg>')}`
      );
      act(() => store.dispatch({ type: 'CHANGE_IMAGE_INPUT', target: 2, query: 'O' }));
      await runJobs();
      view.unmount();
      await act(async () => pending[2]('<svg>closed</svg>'));
      expect(getReviewImage(JSON.stringify([2, 504, 'CC', 'O']))).toBeUndefined();
    });
  });
});

describe('review molecule image failures and RDKit disposal', () => {
  it('shows a stable unavailable image when the molecule cannot be generated', async () => {
    expect.hasAssertions();
    const state = {
      apiReducers: { target_on: 1 },
      previewReducers: { molecule: { imageCache: {} } },
      selectionReducers: selectionReducers(undefined, {})
    };
    const store = legacy_createStore((current = state) => current, applyMiddleware(thunk));
    render(
      <Provider store={store}>
        <ThemeProvider theme={getTheme()}>
          <MoleculeReviewImage observation={{ id: 10, smiles: 'invalid' }} label="v10a" />
        </ThemeProvider>
      </Provider>
    );
    expect(await screen.findByText('Molecule image unavailable')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it.each(['svg', 'highlight'])('releases native molecules when %s generation throws', async failure => {
    expect.hasAssertions();
    const error = new Error('Image generation failed');
    const mol = {
      get_svg_with_highlights() {
        throw error;
      },
      get_substruct_matches() {
        throw error;
      },
      delete() {}
    };
    const query = { delete() {} };
    const molDelete = jest.spyOn(mol, 'delete');
    const queryDelete = jest.spyOn(query, 'delete');
    const module = { get_mol: () => mol, get_qmol: () => query };
    const state = { previewReducers: { molecule: { imageCache: {} } } };
    const store = legacy_createStore((current = state) => current, applyMiddleware(thunk));
    await expect(
      store.dispatch(
        generateAndStoreMolImage({ id: 10, smiles: 'CC' }, 'hit', 180, 160, module, failure === 'highlight' ? 'C' : '')
      )
    ).rejects.toBe(error);
    expect(molDelete).toHaveBeenCalledTimes(1);
    expect(queryDelete).toHaveBeenCalledTimes(failure === 'highlight' ? 1 : 0);
    expect(store.getState().previewReducers.molecule.imageCache).toStrictEqual({});
  });
});
