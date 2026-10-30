import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { applyMiddleware, combineReducers, legacy_createStore } from 'redux';
import { thunk } from 'redux-thunk';
import { ThemeProvider } from '../../../ui/styles';
import { getTheme } from '../../../theme';
import { api } from '../../../utils/api';
import { DJANGO_CONTEXT } from '../../../utils/djangoContext';
import apiReducers from '../../../reducers/api/apiReducers';
import { ToastContext } from '../../toast';
import { QualityStatusWrapper } from '../molecule/moleculeView/qualityStatus/QualityStatusWrapper';
import { ReviewCard } from './ReviewCard';
import { ReviewStatusControls } from './ReviewStatusControls';
import { createReviewStatusController, selectReviewMainStatus } from './reviewMainStatus';

jest.mock('../../../utils/djangoContext', () => ({ DJANGO_CONTEXT: {} }));
jest.mock('../../../utils/api', () => ({ api: jest.fn(), METHOD: { POST: 'POST' } }));

const deferred = () => {
  let resolve;
  const promise = new Promise(accept => {
    resolve = accept;
  });
  return { promise, resolve };
};
const record = overrides => ({
  id: 100,
  site_observation: 10,
  user: 7,
  main_status: true,
  status: 'GOOD',
  comment: 'Main status change',
  timestamp: '2026-10-29T10:00:00Z',
  first_name: 'Test',
  last_name: 'User',
  ...overrides
});
const peer = record({ id: 1, main_status: false, status: 'BAD', user: 8, comment: 'Personal review' });
const item = {
  id: '10',
  label: 'v1a',
  observation: { id: 10, cmpd: 600 },
  pose: { id: 99, main_site_observation: 20 }
};
const setup = (statuses = []) => {
  Object.keys(DJANGO_CONTEXT).forEach(key => delete DJANGO_CONTEXT[key]);
  Object.assign(DJANGO_CONTEXT, { pk: 7, authenticated: true, username: 'tester' });
  api.mockReset();
  const actions = [];
  const reducer = combineReducers({
    apiReducers: (state = { ...apiReducers(undefined, {}), target_on: 1, quality_statuses: statuses }, action) =>
      action.type === 'TEST_TARGET'
        ? { ...state, target_on: action.target, quality_statuses: [] }
        : apiReducers(state, action),
    selectionReducers: (state = { fragmentDisplayList: [10], moleculeAllSelection: [20], proteinList: [30] }) => state
  });
  const store = legacy_createStore(
    reducer,
    applyMiddleware(thunk, () => next => action => {
      actions.push(action);
      return next(action);
    })
  );
  const controller = createReviewStatusController(store);
  const imageToggle = jest.fn();
  const page = open => (
    <Provider store={store}>
      <ThemeProvider theme={getTheme()}>
        <ToastContext.Provider value={{ toastInfo: jest.fn() }}>
          <div aria-label="Navigator summary">
            <QualityStatusWrapper
              data={{ id: 'navigator', main_site_observation: 10 }}
              triggerLabel="Navigator status"
            />
          </div>
          {open && (
            <ReviewCard
              label="v1a"
              image={<button onClick={imageToggle}>Image toggle</button>}
              details={<ReviewStatusControls item={item} />}
            />
          )}
        </ToastContext.Provider>
      </ThemeProvider>
    </Provider>
  );
  return { store, controller, actions, page, imageToggle };
};

describe('review main-status shortcuts', () => {
  it('saves the observation main status, waits for confirmation, updates both summaries, and ignores the current grade', async () => {
    expect.hasAssertions();
    const test = setup([peer]);
    const view = render(test.page(true));
    const response = deferred();
    api.mockReturnValueOnce(response.promise);
    const selection = test.store.getState().selectionReducers;
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Set green main status for v1a' }));
    });
    expect(api).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: expect.stringMatching(/\/api\/site_observation_quality\/$/),
        data: { status: 'GOOD', site_observation: 10, user: 7, main_status: true, comment: 'Main status change' }
      })
    );
    expect(screen.getByRole('progressbar', { name: 'Saving main status for v1a' })).toBeInTheDocument();
    ['green', 'yellow', 'red'].forEach(colour =>
      expect(screen.getByRole('button', { name: `Set ${colour} main status for v1a` })).toBeDisabled()
    );
    expect(screen.getByRole('button', { name: 'Quality status for v1a: NONE' })).toBeInTheDocument();
    await act(async () => {
      view.rerender(test.page(false));
    });
    await act(async () => {
      view.rerender(test.page(true));
    });
    expect(screen.getByRole('button', { name: 'Set red main status for v1a' })).toBeDisabled();
    await act(async () => {
      response.resolve({ data: record() });
    });
    expect(screen.getByRole('button', { name: 'Quality status for v1a: GOOD' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Navigator status: GOOD' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Set green main status for v1a' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Set green main status for v1a' }));
    });
    expect(api).toHaveBeenCalledTimes(1);
    api.mockResolvedValueOnce({ data: record({ id: 101, status: 'MEDIOCRE' }) });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Set yellow main status for v1a' }));
    });
    expect(screen.getByRole('button', { name: 'Quality status for v1a: MEDIOCRE' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Navigator status: MEDIOCRE' })).toBeInTheDocument();
    expect(
      test.store.getState().apiReducers.quality_statuses.filter(status => status.main_status === false)
    ).toStrictEqual([peer]);
    expect(test.store.getState().selectionReducers).toBe(selection);
    expect(test.actions.filter(action => action.type.includes('QUALITY_STATUS'))).toHaveLength(2);
    expect(screen.queryByText('Set status:')).not.toBeInTheDocument();
    expect(test.imageToggle).not.toHaveBeenCalled();
  });

  it('ignores default load records and personal peer reviews, and keeps summary details and peer history available', async () => {
    expect.hasAssertions();
    const test = setup([record({ comment: 'Created on load' }), peer]);
    render(test.page(true));
    expect(screen.getByRole('button', { name: 'Set green main status for v1a' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    const summary = screen.getByRole('button', { name: 'Quality status for v1a: NONE' });
    fireEvent.keyDown(summary, { key: 'Enter' });
    expect(summary).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Peer review:')).toBeInTheDocument();
    expect(screen.getByText('Personal review')).toBeInTheDocument();
    expect(screen.queryByText('Created on load')).not.toBeInTheDocument();
    expect(api).not.toHaveBeenCalled();
  });

  it.each([
    {},
    { pk: 7, authenticated: false, username: 'tester' },
    { authenticated: true, username: 'tester' },
    { pk: 7, authenticated: true, username: 'NOT_LOGGED_IN' }
  ])('disables grading for unauthenticated context %# while keeping summary inspection available', async context => {
    expect.hasAssertions();
    const test = setup([peer]);
    Object.keys(DJANGO_CONTEXT).forEach(key => delete DJANGO_CONTEXT[key]);
    Object.assign(DJANGO_CONTEXT, context);
    render(test.page(true));
    const card = screen.getByRole('listitem', { name: 'v1a' });
    expect(within(card).getAllByRole('button', { name: /Set .* main status/ })).toHaveLength(3);
    within(card)
      .getAllByRole('button', { name: /Set .* main status/ })
      .forEach(button => expect(button).toBeDisabled());
    fireEvent.click(within(card).getByRole('button', { name: 'Quality status for v1a: NONE' }));
    expect(screen.getByText('Peer review:')).toBeInTheDocument();
    expect(screen.getByText('Personal review')).toBeInTheDocument();
    expect(screen.queryByText('Set status:')).not.toBeInTheDocument();
    await test.controller.save(10, 'GOOD');
    expect(api).not.toHaveBeenCalled();
  });

  it('reports a rejected save without changing the grade, allows retry, and never triggers the image button', async () => {
    expect.hasAssertions();
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const test = setup([record({ status: 'BAD' }), peer]);
    render(test.page(true));
    api.mockRejectedValueOnce(new Error('network unavailable'));
    try {
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Set green main status for v1a' }));
      });
      expect(screen.getByRole('alert')).toHaveTextContent('Status not saved. Try again.');
      expect(screen.getByRole('button', { name: 'Quality status for v1a: BAD' })).toBeInTheDocument();
      expect(test.actions.filter(action => action.type.includes('QUALITY_STATUS'))).toHaveLength(0);
      expect(screen.getByRole('button', { name: 'Set green main status for v1a' })).toBeEnabled();
      api.mockResolvedValueOnce({ data: record({ id: 101 }) });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Set green main status for v1a' }));
      });
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Quality status for v1a: GOOD' })).toBeInTheDocument();
      expect(test.actions.every(action => action.type.includes('QUALITY_STATUS'))).toBe(true);
    } finally {
      log.mockRestore();
    }
  });

  it.each([
    [],
    {},
    null,
    { id: 0 },
    record({ id: true }),
    record({ site_observation: '10' }),
    record({ site_observation: 20 }),
    record({ main_status: false }),
    record({ user: 8 }),
    record({ status: 'BAD' }),
    record({ comment: 'Created on load' })
  ])('rejects an invalid or mismatched response %# before acknowledging a grade', async response => {
    expect.hasAssertions();
    const test = setup([peer]);
    api.mockResolvedValueOnce({ data: response });
    expect(await test.controller.save(10, 'GOOD')).toBe(false);
    expect(test.store.getState().apiReducers.quality_statuses).toStrictEqual([peer]);
    expect(test.controller.getSnapshot()['10']).toStrictEqual({
      pending: false,
      error: 'The main status was not saved. Please try again.'
    });
    expect(test.actions).toHaveLength(0);
  });

  it('deduplicates pending requests per observation while other observations save concurrently', async () => {
    expect.hasAssertions();
    const test = setup();
    const first = deferred();
    const second = deferred();
    api.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const saving = test.controller.save(10, 'GOOD');
    expect(test.controller.save(10, 'BAD')).toBe(saving);
    const other = test.controller.save(20, 'BAD');
    await Promise.resolve();
    expect(api).toHaveBeenCalledTimes(2);
    second.resolve({ data: record({ id: 102, site_observation: 20, status: 'BAD' }) });
    await other;
    expect(test.controller.getSnapshot()['10'].pending).toBe(true);
    first.resolve({ data: record() });
    await saving;
    expect(selectReviewMainStatus(test.store.getState(), 10)).toBe('GOOD');
    expect(selectReviewMainStatus(test.store.getState(), 20)).toBe('BAD');
  });

  it('invalidates feedback and late completions on target changes without clearing a newer request', async () => {
    expect.hasAssertions();
    const test = setup();
    const first = deferred();
    const second = deferred();
    api.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const old = test.controller.save(10, 'GOOD');
    await Promise.resolve();

    test.store.dispatch({ type: 'TEST_TARGET', target: 2 });

    test.store.dispatch({ type: 'TEST_TARGET', target: 1 });

    expect(test.controller.getSnapshot()).toStrictEqual({});
    const latest = test.controller.save(10, 'BAD');
    first.resolve({ data: record() });
    await old;
    expect(test.store.getState().apiReducers.quality_statuses).toStrictEqual([]);
    expect(test.controller.getSnapshot()['10'].pending).toBe(true);
    second.resolve({ data: record({ id: 101, status: 'BAD' }) });
    await latest;
    expect(selectReviewMainStatus(test.store.getState(), 10)).toBe('BAD');
  });
});
