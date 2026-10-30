import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '../../../ui/styles';
import { getTheme } from '../../../theme';
import { DJANGO_CONTEXT } from '../../../utils/djangoContext';
import { api } from '../../../utils/api';
import { TooltipProvider } from '../../tooltip/TooltipContext';
import { tootlipProvider } from '../../tooltip/resolver';
import { ReviewDesignDbAction } from './ReviewDesignDbAction';

jest.mock('../../../utils/djangoContext', () => ({ DJANGO_CONTEXT: {} }));
jest.mock('../../../utils/api', () => ({ api: jest.fn(), METHOD: { POST: 'POST' } }));

const setup = context => {
  Object.keys(DJANGO_CONTEXT).forEach(key => delete DJANGO_CONTEXT[key]);
  Object.assign(DJANGO_CONTEXT, context);
  api.mockClear();
  return render(
    <ThemeProvider theme={getTheme()}>
      <TooltipProvider provider={tootlipProvider}>
        <ReviewDesignDbAction />
      </TooltipProvider>
    </ThemeProvider>
  );
};

describe('review DesignDB placeholder', () => {
  it('labels the warning, disables confirmation, and dismisses with NO without submitting', async () => {
    expect.hasAssertions();
    setup({ pk: 7, authenticated: true, username: 'tester' });
    const user = userEvent.setup();
    const action = screen.getByRole('button', { name: 'Push to DesignDB' });
    expect(action).toBeEnabled();
    await user.click(action);
    const dialog = screen.getByRole('dialog', { name: 'WARNING! Coming soon' });
    expect(dialog).toHaveAccessibleDescription(
      'Are you sure you want to push the most recent Design status to DesignDB? This step cannot be reverted!'
    );
    const yes = within(dialog).getByRole('button', { name: 'YES', exact: true });
    expect(yes).toBeDisabled();
    fireEvent.click(yes);
    expect(dialog).toBeVisible();
    expect(within(dialog).getByRole('button', { name: 'NO', exact: true })).toHaveFocus();
    await user.click(within(dialog).getByRole('button', { name: 'NO', exact: true }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(action).toHaveFocus();
    expect(api).not.toHaveBeenCalled();
  });

  it('supports keyboard opening and Escape dismissal without submitting', async () => {
    expect.hasAssertions();
    setup({ pk: 7 });
    const user = userEvent.setup();
    await user.tab();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('dialog', { name: 'WARNING! Coming soon' })).toBeVisible();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Push to DesignDB' })).toHaveFocus();
    expect(api).not.toHaveBeenCalled();
  });

  it.each([{}, { pk: 0 }, { pk: 7, authenticated: false }, { pk: 7, username: 'NOT_LOGGED_IN' }])(
    'preserves Django authentication gating for %j',
    context => {
      expect.hasAssertions();
      setup(context);
      const action = screen.getByRole('button', { name: 'Push to DesignDB' });
      expect(action).toBeDisabled();
      fireEvent.click(action);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(api).not.toHaveBeenCalled();
    }
  );

  it('explains the disabled logged-out action through its tooltip path', async () => {
    expect.hasAssertions();
    setup({ pk: 7, authenticated: false });
    const user = userEvent.setup();
    await user.hover(screen.getByRole('button', { name: 'Push to DesignDB' }).parentElement);
    expect(await screen.findByRole('tooltip', {}, { timeout: 2500 })).toHaveTextContent(
      'Log in to preview Push to DesignDB. This feature is coming soon'
    );
    expect(api).not.toHaveBeenCalled();
  });
});
