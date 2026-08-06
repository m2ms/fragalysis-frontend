export const POSE_TRANSFER_ORDERS = Object.freeze({
  REMOVE_FIRST: 'remove-first',
  ADD_FIRST: 'add-first'
});

export const POSE_TRANSFER_SCHEDULING = Object.freeze({
  PHASED: 'phased',
  OVERLAPPED: 'overlapped'
});

export const DEFAULT_RHS_POSE_NAVIGATION_CONFIG = Object.freeze({
  transferOrder: POSE_TRANSFER_ORDERS.REMOVE_FIRST,
  transferScheduling: POSE_TRANSFER_SCHEDULING.OVERLAPPED,
  centerOnDestinationLigandAfterTransfer: true
});

export const normalizeRhsPoseNavigationConfig = config => ({
  transferOrder: Object.values(POSE_TRANSFER_ORDERS).includes(config?.transferOrder)
    ? config.transferOrder
    : DEFAULT_RHS_POSE_NAVIGATION_CONFIG.transferOrder,
  transferScheduling: Object.values(POSE_TRANSFER_SCHEDULING).includes(config?.transferScheduling)
    ? config.transferScheduling
    : DEFAULT_RHS_POSE_NAVIGATION_CONFIG.transferScheduling,
  centerOnDestinationLigandAfterTransfer:
    typeof config?.centerOnDestinationLigandAfterTransfer === 'boolean'
      ? config.centerOnDestinationLigandAfterTransfer
      : DEFAULT_RHS_POSE_NAVIGATION_CONFIG.centerOnDestinationLigandAfterTransfer
});
