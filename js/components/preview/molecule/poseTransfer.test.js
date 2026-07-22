import {
  captureControlSnapshots,
  capturePoseTransferSnapshot,
  executePoseTransfer,
  getAdjacentPoses,
  getFirstEligiblePoseTransfers,
  hasPoseTransferState
} from './poseTransfer';

const createControl = key => ({
  key,
  getActiveState: (state, item) => state.active[key]?.[item.id] || false,
  getSelectedItems: state => Object.keys(state.active[key] || {}).map(id => ({ id })),
  captureCustomization: ({ item, activeState }) => ({ sourceId: item.id, value: activeState.value })
});

const createEligibilityConfig = controls => ({
  poseControls: controls,
  inspirationControls: controls,
  getPoseItems: ({ pose }) => pose.poseItems || [],
  getInspirationItems: ({ pose }) => pose.inspirationItems || [],
  getInspirationStateItems: ({ pose }) => pose.inspirationItems || []
});

describe('pose transfer helpers', () => {
  it('uses the supplied displayed order and exposes null at list boundaries', () => {
    expect.hasAssertions();
    const displayedOrder = [{ id: 'filtered-third' }, { id: 'filtered-first' }, { id: 'filtered-second' }];

    expect(getAdjacentPoses(displayedOrder, 'filtered-first')).toStrictEqual({
      previousPose: displayedOrder[0],
      nextPose: displayedOrder[2]
    });
    expect(getAdjacentPoses(displayedOrder, 'filtered-third').previousPose).toBeNull();
    expect(getAdjacentPoses(displayedOrder, 'filtered-second').nextPose).toBeNull();
  });

  it('finds the first eligible source independently for each toolbar direction', () => {
    expect.hasAssertions();
    const ligand = createControl('ligand');
    const state = {
      active: {
        ligand: {
          firstObservation: { value: 'top-boundary' },
          thirdObservation: { value: 'first-valid-up' }
        }
      }
    };
    const displayedOrder = [
      { id: 'first', poseItems: [{ id: 'firstObservation' }] },
      { id: 'second', poseItems: [{ id: 'secondObservation' }] },
      { id: 'third', poseItems: [{ id: 'thirdObservation' }] },
      { id: 'fourth', poseItems: [{ id: 'fourthObservation' }] }
    ];

    const transfers = getFirstEligiblePoseTransfers({
      orderedPoses: displayedOrder,
      state,
      config: createEligibilityConfig([ligand])
    });

    expect(transfers.next).toStrictEqual({
      sourcePose: displayedOrder[0],
      destinationPose: displayedOrder[1]
    });
    expect(transfers.previous).toStrictEqual({
      sourcePose: displayedOrder[2],
      destinationPose: displayedOrder[1]
    });
  });

  it('treats active inspiration controls as toolbar-transfer eligibility', () => {
    expect.hasAssertions();
    const protein = createControl('protein');
    const state = {
      active: {
        protein: {
          inspirationB: { value: 'inspiration-protein' }
        }
      }
    };
    const displayedOrder = [
      { id: 'filtered-third' },
      { id: 'filtered-first', inspirationItems: [{ id: 'inspirationB' }] },
      { id: 'filtered-second' }
    ];

    const transfers = getFirstEligiblePoseTransfers({
      orderedPoses: displayedOrder,
      state,
      config: createEligibilityConfig([protein])
    });

    expect(transfers.previous?.sourcePose.id).toBe('filtered-first');
    expect(transfers.previous?.destinationPose.id).toBe('filtered-third');
    expect(transfers.next?.sourcePose.id).toBe('filtered-first');
    expect(transfers.next?.destinationPose.id).toBe('filtered-second');
  });

  it('returns disabled toolbar candidates when no pose is eligible', () => {
    expect.hasAssertions();
    const ligand = createControl('ligand');
    const transfers = getFirstEligiblePoseTransfers({
      orderedPoses: [{ id: 'first' }, { id: 'second' }],
      state: { active: { ligand: {} } },
      config: createEligibilityConfig([ligand])
    });

    expect(transfers).toStrictEqual({ previous: null, next: null });
  });

  it('captures the first active source and its customization for each control', () => {
    expect.hasAssertions();
    const density = createControl('density');
    const state = {
      active: {
        density: {
          first: { value: 'blue' },
          second: { value: 'red' }
        }
      }
    };

    const snapshots = captureControlSnapshots(state, [{ id: 'first' }, { id: 'second' }], [density]);

    expect(snapshots.density.sourceItem.id).toBe('first');
    expect(snapshots.density.customization).toStrictEqual({ sourceId: 'first', value: 'blue' });
  });

  it('creates the union of controls active on different inspirations', () => {
    expect.hasAssertions();
    const ligand = createControl('ligand');
    const protein = createControl('protein');
    const state = {
      active: {
        ligand: { inspirationA: { value: 'ligand-settings' } },
        protein: { inspirationB: { value: 'protein-settings' } }
      }
    };
    const inspirationItems = [{ id: 'inspirationA' }, { id: 'inspirationB' }];

    const snapshot = capturePoseTransferSnapshot({
      state,
      poseItems: [],
      inspirationItems,
      poseControls: [],
      inspirationControls: [ligand, protein]
    });

    expect(Object.keys(snapshot.inspirations)).toStrictEqual(['ligand', 'protein']);
    expect(
      hasPoseTransferState({
        state,
        poseItems: [],
        inspirationItems,
        poseControls: [],
        inspirationControls: [ligand, protein]
      })
    ).toBe(true);
  });

  it('clears all selected objects before applying the captured union to every destination inspiration', async () => {
    expect.hasAssertions();
    const events = [];
    const state = {
      active: {
        ligand: {
          sourcePoseObservation: { value: 'pose-ligand' },
          inspirationA: { value: 'inspiration-ligand' },
          unrelated: { value: 'remove-me' }
        },
        protein: {
          inspirationB: { value: 'inspiration-protein' }
        }
      }
    };
    const createExecutableControl = key => ({
      ...createControl(key),
      remove: ({ selectedItem }) => {
        events.push(`remove:${key}:${selectedItem.id}`);
        delete state.active[key][selectedItem.id];
      },
      apply: ({ target, customization }) => {
        events.push(`apply:${key}:${target.id}:${customization.value}`);
      }
    });
    const ligand = createExecutableControl('ligand');
    const protein = createExecutableControl('protein');
    const sourcePose = {
      id: 'source',
      poseItems: [{ id: 'sourcePoseObservation' }],
      inspirationItems: [{ id: 'inspirationA' }, { id: 'inspirationB' }]
    };
    const destinationPose = {
      id: 'destination',
      poseTargets: [{ id: 'destinationPoseObservation' }],
      inspirationItems: [{ id: 'inspirationC' }, { id: 'inspirationD' }]
    };
    const config = {
      poseControls: [ligand],
      inspirationControls: [ligand, protein],
      getPoseItems: ({ pose }) => pose.poseItems || [],
      getPoseTargets: ({ pose }) => pose.poseTargets || [],
      getInspirationItems: ({ pose }) => pose.inspirationItems || [],
      dialogs: {
        capture: () => ({ transferInspirations: true }),
        beforeTransfer: () => events.push('dialogs:close-others')
      }
    };
    const getState = () => state;
    const dispatch = action => (typeof action === 'function' ? action(dispatch, getState) : action);

    const result = await executePoseTransfer({ config, sourcePose, destinationPose, stage: {} })(
      dispatch,
      getState
    );

    const firstApplyIndex = events.findIndex(event => event.startsWith('apply:'));
    const lastRemoveIndex = events.reduce(
      (lastIndex, event, index) => (event.startsWith('remove:') ? index : lastIndex),
      -1
    );

    expect(firstApplyIndex).toBeGreaterThan(lastRemoveIndex);
    expect(events).toStrictEqual(
      expect.arrayContaining([
        'apply:ligand:destinationPoseObservation:pose-ligand',
        'apply:ligand:inspirationC:inspiration-ligand',
        'apply:ligand:inspirationD:inspiration-ligand',
        'apply:protein:inspirationC:inspiration-protein',
        'apply:protein:inspirationD:inspiration-protein'
      ])
    );
    expect(result.destinationInspirationIds).toStrictEqual(['inspirationC', 'inspirationD']);
    expect(result.dialogState).toStrictEqual({ transferInspirations: true });
  });
});
