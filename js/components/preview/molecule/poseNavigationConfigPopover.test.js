import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { PoseNavigationConfigPopover } from './poseNavigationConfigPopover';
import {
  DEFAULT_RHS_POSE_NAVIGATION_CONFIG,
  POSE_TRANSFER_ORDERS,
  POSE_TRANSFER_SCHEDULING
} from '../../../constants/poseNavigation';

describe('pose navigation config popover', () => {
  it('renders the injected values and emits partial configuration changes', () => {
    expect.hasAssertions();
    const onChange = jest.fn();

    render(
      <PoseNavigationConfigPopover
        value={{ ...DEFAULT_RHS_POSE_NAVIGATION_CONFIG }}
        onChange={onChange}
      />
    );

    expect(screen.getByRole('radio', { name: 'Remove first' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Overlapped' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Center on destination ligand' })).not.toBeChecked();

    fireEvent.click(screen.getByRole('radio', { name: 'Add first' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Phased' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Center on destination ligand' }));

    expect(onChange).toHaveBeenNthCalledWith(1, {
      transferOrder: POSE_TRANSFER_ORDERS.ADD_FIRST
    });
    expect(onChange).toHaveBeenNthCalledWith(2, {
      transferScheduling: POSE_TRANSFER_SCHEDULING.PHASED
    });
    expect(onChange).toHaveBeenNthCalledWith(3, {
      centerOnDestinationLigandAfterTransfer: true
    });
  });
});
