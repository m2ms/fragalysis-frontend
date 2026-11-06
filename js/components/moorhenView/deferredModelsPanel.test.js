import React, { useEffect, useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { legacy_createStore } from 'redux';
import { withDeferredModelsPanel } from './deferredModelsPanel';
import { bulkLigandPreset, setBulkLigandSettings } from '../../reducers/ngl/bulkLigandSettings';

describe('deferred native Models panel', () => {
  it('skips the unopened panel, reacts to Apply, then retains controls and the canvas after first use', () => {
    expect.hasAssertions();
    setBulkLigandSettings(bulkLigandPreset('native'));
    const mounts = jest.fn();
    const store = legacy_createStore((state = { modals: { activeModals: [] } }, action) =>
      action.type === 'OPEN'
        ? { modals: { activeModals: ['Models'] } }
        : action.type === 'CLOSE'
        ? { modals: { activeModals: [] } }
        : state
    );
    const NativePanel = () => {
      const [value, setValue] = useState('native defaults');
      useEffect(() => {
        mounts();
      }, []);
      return <input aria-label="native control" value={value} onChange={event => setValue(event.target.value)} />;
    };
    const Panel = withDeferredModelsPanel(NativePanel, 'Models');
    const view = render(
      <>
        <canvas data-testid="canvas" />
        <Panel store={store} />
      </>
    );
    const canvas = screen.getByTestId('canvas');
    expect(screen.queryByLabelText('native control')).not.toBeInTheDocument();
    expect(mounts).not.toHaveBeenCalled();
    act(() => setBulkLigandSettings(bulkLigandPreset('combined')));
    expect(screen.getByLabelText('native control')).toBeInTheDocument();
    act(() => setBulkLigandSettings(bulkLigandPreset('native')));
    expect(screen.queryByLabelText('native control')).not.toBeInTheDocument();
    act(() => store.dispatch({ type: 'OPEN' }));
    fireEvent.change(screen.getByLabelText('native control'), { target: { value: 'custom setting' } });
    const mountCount = mounts.mock.calls.length;
    act(() => store.dispatch({ type: 'CLOSE' }));
    act(() => store.dispatch({ type: 'OPEN' }));
    expect(screen.getByLabelText('native control')).toHaveValue('custom setting');
    expect(mounts).toHaveBeenCalledTimes(mountCount);
    expect(screen.getByTestId('canvas')).toBe(canvas);
    view.unmount();
    setBulkLigandSettings(bulkLigandPreset('combined'));
  });
});
