const DEFAULT_CLEAR_TIMEOUT = 10000;
const CLEAR_POLL_INTERVAL = 25;

export const getAdjacentPoses = (orderedPoses = [], poseId) => {
  const index = orderedPoses.findIndex(pose => pose.id === poseId);

  return {
    previousPose: index > 0 ? orderedPoses[index - 1] : null,
    nextPose: index >= 0 && index < orderedPoses.length - 1 ? orderedPoses[index + 1] : null
  };
};

const uniqueControls = controls => [...new Set((controls || []).filter(Boolean))];

const getActiveControlSnapshot = (state, items, control) => {
  for (const item of items || []) {
    const activeState = control.getActiveState(state, item);

    if (activeState) {
      return {
        activeState,
        customization: control.captureCustomization?.({ state, item, activeState }),
        sourceItem: item
      };
    }
  }

  return null;
};

export const captureControlSnapshots = (state, items, controls) =>
  (controls || []).reduce((snapshots, control) => {
    const snapshot = getActiveControlSnapshot(state, items, control);

    if (snapshot) {
      snapshots[control.key] = snapshot;
    }

    return snapshots;
  }, {});

export const capturePoseTransferSnapshot = ({
  state,
  poseItems,
  inspirationItems,
  poseControls,
  inspirationControls
}) => ({
  pose: captureControlSnapshots(state, poseItems, poseControls),
  inspirations: captureControlSnapshots(state, inspirationItems, inspirationControls)
});

export const hasPoseTransferState = ({
  state,
  poseItems,
  inspirationItems,
  poseControls,
  inspirationControls
}) =>
  (poseControls || []).some(control =>
    (poseItems || []).some(item => Boolean(control.getActiveState(state, item)))
  ) ||
  (inspirationControls || []).some(control =>
    (inspirationItems || []).some(item => Boolean(control.getActiveState(state, item)))
  );

export const hasPoseTransferStateForPose = ({ state, pose, config }) => {
  if (!config || !pose) {
    return false;
  }

  const inspirationItems = config.getInspirationStateItems
    ? config.getInspirationStateItems({ state, pose })
    : config.getInspirationItems({ state, pose });

  return hasPoseTransferState({
    state,
    poseItems: config.getPoseItems({ state, pose }),
    inspirationItems,
    poseControls: config.poseControls,
    inspirationControls: config.inspirationControls
  });
};

export const getFirstEligiblePoseTransfers = ({ orderedPoses = [], state, config }) => {
  const transfers = {
    previous: null,
    next: null
  };

  if (!config || orderedPoses.length < 2) {
    return transfers;
  }

  for (let index = 0; index < orderedPoses.length; index++) {
    const canMovePrevious = transfers.previous === null && index > 0;
    const canMoveNext = transfers.next === null && index < orderedPoses.length - 1;

    if (
      (canMovePrevious || canMoveNext) &&
      hasPoseTransferStateForPose({ state, pose: orderedPoses[index], config })
    ) {
      if (canMovePrevious) {
        transfers.previous = {
          sourcePose: orderedPoses[index],
          destinationPose: orderedPoses[index - 1]
        };
      }
      if (canMoveNext) {
        transfers.next = {
          sourcePose: orderedPoses[index],
          destinationPose: orderedPoses[index + 1]
        };
      }
    }

    if (transfers.previous && transfers.next) {
      break;
    }
  }

  return transfers;
};

const areControlsClear = (state, controls) =>
  uniqueControls(controls).every(control => (control.getSelectedItems?.(state) || []).length === 0);

const waitForControlsToClear = (getState, controls, timeout = DEFAULT_CLEAR_TIMEOUT) => {
  if (areControlsClear(getState(), controls)) {
    return Promise.resolve();
  }

  return new Promise(resolve => {
    const startedAt = Date.now();

    const poll = () => {
      if (areControlsClear(getState(), controls) || Date.now() - startedAt >= timeout) {
        resolve();
        return;
      }

      setTimeout(poll, CLEAR_POLL_INTERVAL);
    };

    setTimeout(poll, CLEAR_POLL_INTERVAL);
  });
};

const clearSelectedControls = async ({ dispatch, getState, stage, controls }) => {
  const state = getState();

  await Promise.all(
    uniqueControls(controls).flatMap(control =>
      (control.getSelectedItems?.(state) || []).map(selectedItem =>
        Promise.resolve(control.remove({ dispatch, stage, selectedItem, state }))
      )
    )
  );
};

const applySnapshots = async ({ dispatch, getState, stage, controls, snapshots, targets }) => {
  const controlsByKey = new Map((controls || []).map(control => [control.key, control]));

  await Promise.all(
    Object.entries(snapshots).flatMap(([key, snapshot]) => {
      const control = controlsByKey.get(key);

      if (!control) {
        return [];
      }

      return (targets || [])
        .filter(target => control.isAvailable?.({ state: getState(), item: target, snapshot }) !== false)
        .map(target =>
          Promise.resolve(
            control.apply({
              dispatch,
              getState,
              stage,
              target,
              activeState: snapshot.activeState,
              customization: snapshot.customization,
              sourceItem: snapshot.sourceItem
            })
          )
        );
    })
  );
};

export const executePoseTransfer = ({ config, sourcePose, destinationPose, stage }) => async (
  dispatch,
  getState
) => {
  const initialState = getState();
  const sourcePoseItems = config.getPoseItems({ state: initialState, pose: sourcePose });
  const sourceInspirationItems = config.getInspirationItems({ state: initialState, pose: sourcePose });
  const destinationPoseItems = config.getPoseTargets({ state: initialState, pose: destinationPose });
  const destinationInspirationItems = config.getInspirationItems({ state: initialState, pose: destinationPose });
  const snapshot = capturePoseTransferSnapshot({
    state: initialState,
    poseItems: sourcePoseItems,
    inspirationItems: sourceInspirationItems,
    poseControls: config.poseControls,
    inspirationControls: config.inspirationControls
  });
  const dialogState = config.dialogs?.capture?.({ state: initialState, sourcePose }) || null;
  const controlsToClear = uniqueControls([...(config.poseControls || []), ...(config.inspirationControls || [])]);

  await Promise.resolve(
    config.dialogs?.beforeTransfer?.({
      dispatch,
      dialogState,
      sourcePose,
      destinationPose
    })
  );

  await clearSelectedControls({ dispatch, getState, stage, controls: controlsToClear });
  await waitForControlsToClear(getState, controlsToClear, config.clearTimeout);

  await applySnapshots({
    dispatch,
    getState,
    stage,
    controls: config.poseControls,
    snapshots: snapshot.pose,
    targets: destinationPoseItems
  });
  await applySnapshots({
    dispatch,
    getState,
    stage,
    controls: config.inspirationControls,
    snapshots: snapshot.inspirations,
    targets: destinationInspirationItems
  });

  return {
    dialogState,
    snapshot,
    destinationInspirationIds: destinationInspirationItems.map(item => item.id)
  };
};
