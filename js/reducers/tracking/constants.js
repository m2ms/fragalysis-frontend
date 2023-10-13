const prefix = 'REDUCERS_TRACKING_';

export const constants = {
  SET_ACTIONS_LIST: prefix + 'SET_ACTIONS_LIST',
  APPEND_ACTIONS_LIST: prefix + 'APPEND_ACTIONS_LIST',
  SET_CURRENT_ACTIONS_LIST: prefix + 'SET_CURRENT_ACTIONS_LIST',
  SET_IS_TRACKING_COMPOUNDS_RESTORING: prefix + 'SET_IS_TRACKING_COMPOUNDS_RESTORING',
  SET_IS_TRACKING_MOLECULES_RESTORING: prefix + 'SET_IS_TRACKING_MOLECULES_RESTORING',
  SET_IS_UNDO_REDO_ACTION: prefix + 'SET_IS_UNDO_REDO_ACTION',
  SET_SEND_ACTIONS_LIST: prefix + 'SET_SEND_ACTIONS_LIST',
  APPEND_SEND_ACTIONS_LIST: prefix + 'APPEND_SEND_ACTIONS_LIST',
  SET_IS_ACTIONS_SENDING: prefix + 'SET_IS_ACTIONS_SENDING',
  SET_IS_ACTIONS_LOADING: prefix + 'SET_IS_ACTIONS_LOADING',
  SET_PROJECT_ACTIONS_LIST: prefix + 'SET_PROJECT_ACTIONS_LIST',
  SET_IS_ACTIONS_SAVING: prefix + 'SET_IS_ACTIONS_SAVING',
  SET_IS_ACTIONS_RESTORING: prefix + 'SET_IS_ACTIONS_RESTORING',
  SET_IS_ACTION_TRACKING: prefix + 'SET_IS_ACTION_TRACKING',
  RESET_TRACKING_STATE: prefix + 'RESET_TRACKING_STATE',
  SET_TRACKING_IMAGE_SOURCE: prefix + 'SET_TRACKING_IMAGE_SOURCE',
  SET_SNAPSOT_IMAGE_ACTIONS_LIST: prefix + 'SET_SNAPSOT_IMAGE_ACTIONS_LIST',
  APPEND_UNDO_REDO_ACTIONS_LIST: prefix + 'APPEND_UNDO_REDO_ACTIONS_LIST',
  SET_UNDO_REDO_ACTIONS_LIST: prefix + 'SET_UNDO_REDO_ACTIONS_LIST',
  SET_PROJECT_ACTIONS_LIST_LOADED: prefix + 'SET_PROJECT_ACTIONS_LIST_LOADED',
  SET_SKIP_ORIENTATION_CHANGE: prefix + 'SET_SKIP_ORIENTATION_CHANGE', //when snapshot is switched we want to skip orientation change so it doesn't blink through multiple states
  SET_IS_SNAPSHOT_DIRTY: prefix + 'SET_IS_SNAPSHOT_DIRTY'
};

export const actionType = {
  TARGET_LOADED: 'TARGET_LOADED',
  SITE_TURNED_ON: 'SITE_TURNED_ON',
  SITE_TURNED_OFF: 'SITE_TURNED_OFF',
  LIGAND_TURNED_ON: 'LIGAND_TURNED_ON',
  LIGAND_TURNED_OFF: 'LIGAND_TURNED_OFF',
  SIDECHAINS_TURNED_ON: 'SIDECHAINS_TURNED_ON',
  SIDECHAINS_TURNED_OFF: 'SIDECHAINS_TURNED_OFF',
  INTERACTIONS_TURNED_ON: 'INTERACTIONS_TURNED_ON',
  INTERACTIONS_TURNED_OFF: 'INTERACTIONS_TURNED_OFF',
  SURFACE_TURNED_ON: 'SURFACE_TURNED_ON',
  SURFACE_TURNED_OFF: 'SURFACE_TURNED_OFF',
  DENSITY_TURNED_ON: 'DENSITY_TURNED_ON',
  DENSITY_TURNED_OFF: 'DENSITY_TURNED_OFF',
  DENSITY_CUSTOM_TURNED_ON: 'DENSITY_CUSTOM_TURNED_ON',
  DENSITY_CUSTOM_TURNED_OFF: 'DENSITY_CUSTOM_TURNED_OFF',
  DENSITY_TYPE_ON: 'DENSITY_TYPE_ON',
  DENSITY_TYPE_OFF: 'DENSITY_TYPE_OFF',
  QUALITY_TURNED_ON: 'QUALITY_TURNED_ON',
  QUALITY_TURNED_OFF: 'QUALITY_TURNED_OFF',
  VECTORS_TURNED_ON: 'VECTORS_TURNED_ON',
  VECTORS_TURNED_OFF: 'VECTORS_TURNED_OFF',
  CLASS_SELECTED: 'CLASS_SELECTED',
  CLASS_UPDATED: 'CLASS_UPDATED',
  VECTOR_SELECTED: 'VECTOR_SELECTED',
  VECTOR_DESELECTED: 'VECTOR_DESELECTED',
  MOLECULE_ADDED_TO_SHOPPING_CART: 'MOLECULE_ADDED_TO_SHOPPING_CART',
  MOLECULE_ADDED_TO_SHOPPING_CART_ALL: 'MOLECULE_ADDED_TO_SHOPPING_CART_ALL',
  MOLECULE_REMOVED_FROM_SHOPPING_CART: 'MOLECULE_REMOVED_FROM_SHOPPING_CART',
  MOLECULE_REMOVED_FROM_SHOPPING_CART_ALL: 'MOLECULE_REMOVED_FROM_SHOPPING_CART_ALL',
  VECTOR_COUMPOUND_ADDED: 'VECTOR_COUMPOUND_ADDED',
  VECTOR_COUMPOUND_REMOVED: 'VECTOR_COUMPOUND_REMOVED',
  COMPOUND_SELECTED: 'COMPOUND_SELECTED',
  COMPOUND_DESELECTED: 'COMPOUND_DESELECTED',
  REPRESENTATION_UPDATED: 'REPRESENTATION_UPDATED',
  REPRESENTATION_VISIBILITY_UPDATED: 'REPRESENTATION_VISIBILITY_UPDATED',
  REPRESENTATION_VISIBILITY_ALL_UPDATED: 'REPRESENTATION_VISIBILITY_ALL_UPDATED',
  REPRESENTATION_ADDED: 'REPRESENTATION_ADDED',
  REPRESENTATION_REMOVED: 'REPRESENTATION_REMOVED',
  REPRESENTATION_CHANGED: 'REPRESENTATION_CHANGED',
  NGL_STATE: 'NGL_STATE',
  UNDO: 'UNDO',
  REDO: 'REDO',
  ARROW_NAVIGATION: 'ARROW_NAVIGATION',
  SNAPSHOT: 'SNAPSHOT',
  TAB: 'TAB',
  DATASET_INDEX: 'DATASET_INDEX',
  DATASET_FILTER: 'DATASET_FILTER',
  DATASET_FILTER_SCORE: 'DATASET_FILTER_SCORE',
  DRAG_DROP_FINISHED: 'DRAG_DROP_FINISHED',
  ALL_HIDE: 'ALL_HIDE',
  ALL_TURNED_ON: 'ALL_TURNED_ON',
  ALL_TURNED_OFF: 'ALL_TURNED_OFF',
  SELECTED_TURNED_ON_BY_TYPE: 'SELECTED_TURNED_ON_BY_TYPE',
  ALL_TURNED_OFF_BY_TYPE: 'ALL_TURNED_OFF_BY_TYPE',
  BACKGROUND_COLOR_CHANGED: 'BACKGROUND_COLOR_CHANGED',
  CLIP_NEAR: 'CLIP_NEAR',
  CLIP_FAR: 'CLIP_FAR',
  CLIP_DIST: 'CLIP_DIST',
  FOG_NEAR: 'FOG_NEAR',
  FOG_FAR: 'FOG_FAR',
  ISO_LEVEL_EVENT: 'ISO_LEVEL_EVENT',
  BOX_SIZE_EVENT: 'BOX_SIZE_EVENT',
  OPACITY_EVENT: 'OPACITY_EVENT',
  CONTOUR_EVENT: 'CONTOUR_EVENT',
  COLOR_EVENT: 'COLOR_EVENT',
  ISO_LEVEL_SIGMAA: 'ISO_LEVEL_SIGMAA',
  BOX_SIZE_SIGMAA: 'BOX_SIZE_SIGMAA',
  OPACITY_SIGMAA: 'OPACITY_SIGMAA',
  CONTOUR_SIGMAA: 'CONTOUR_SIGMAA',
  COLOR_SIGMAA: 'COLOR_SIGMAA',
  ISO_LEVEL_DIFF: 'ISO_LEVEL_DIFF',
  BOX_SIZE_DIFF: 'BOX_SIZE_DIFF',
  OPACITY_DIFF: 'OPACITY_DIFF',
  CONTOUR_DIFF: 'CONTOUR_DIFF',
  COLOR_DIFF: 'COLOR_DIFF',
  WARNING_ICON: 'WARNING_ICON',
  TAG_SELECTED: 'TAG_SELECTED',
  TAG_UNSELECTED: 'TAG_UNSELECTED',
  TURN_SIDE: 'TURN_SIDE',
  MOLECULE_SELECTED: 'MOLECULE_SELECTED',
  MOLECULE_UNSELECTED: 'MOLECULE_UNSELECTED',
  ALL_MOLECULES_SELECTED: 'ALL_MOLECULES_SELECTED',
  ALL_MOLECULES_UNSELECTED: 'ALL_MOLECULES_UNSELECTED',
  SEARCH_STRING: 'SEARCH_STRING',
  SEARCH_STRING_HIT_NAVIGATOR: 'SEARCH_STRING_HIT_NAVIGATOR',
  COMPOUND_LOCKED: 'COMPOUND_LOCKED',
  COMPOUND_UNLOCKED: 'COMPOUND_UNLOCKED',
  COMPOUND_ADDED_TO_COLOR_GROUP: 'COMPOUND_ADDED_TO_COLOR_GROUP',
  COMPOUND_REMOVED_FROM_COLOR_GROUP: 'COMPOUND_REMOVED_FROM_COLOR_GROUP',
  TAG_DETAIL_VIEW: 'TAG_DETAIL_VIEW',
  SELECT_ALL_DATASET_COMPOUNDS: 'SELECT_ALL_DATASET_COMPOUNDS',
  SELECTED_SELECT_ALL_BUTTON_FOR_DATASET: 'SELECTED_SELECT_ALL_BUTTON_FOR_DATASET',
  ALL_COMPOUNDS_ADDED_TO_COLOR_GROUP: 'ALL_COMPOUNDS_ADDED_TO_COLOR_GROUP',
  ALL_COMPOUNDS_REMOVED_FROM_COLOR_GROUP: 'ALL_COMPOUNDS_REMOVED_FROM_COLOR_GROUP'
};

export const snapshotSwitchManualActions = [
  actionType.LIGAND_TURNED_ON,
  actionType.SIDECHAINS_TURNED_ON,
  actionType.SURFACE_TURNED_ON,
  actionType.DENSITY_TURNED_ON,
  actionType.DENSITY_CUSTOM_TURNED_ON,
  // actionType.DENSITY_TYPE_ON, //I don't know what this one is for but it's not processed anywhere
  actionType.QUALITY_TURNED_OFF,
  actionType.VECTORS_TURNED_ON,
  actionType.INTERACTIONS_TURNED_ON,
  actionType.ALL_TURNED_ON
];

export const actionDescription = {
  LOADED: 'was loaded',
  TURNED_ON: 'was turned on',
  TURNED_OFF: 'was turned off',
  MOVED: 'was moved',
  SELECTED: 'was selected',
  DESELECTED: 'was deselected',
  LOCKED: 'was locked',
  UNLOCKED: 'was unlocked',
  ADDED_TO_COLOR_GROUP: 'was added to color group',
  REMOVED_FROM_COLOR_GROUP: 'was removed from color group',
  HIDDEN: 'hidden',
  VISIBLE: 'visible',
  CANCELED: 'canceled',
  ADDED: 'was added',
  REMOVED: 'was removed',
  CHANGED: 'was changed',
  UPDATED: 'was updated',
  VISIBILITY: 'visiblity',
  TO_SHOPPING_CART: 'to shopping cart',
  FROM_SHOPPING_CART: 'from shopping cart',
  LIGAND: 'Ligand',
  SIDECHAIN: 'Sidechain',
  INTERACTION: 'Interaction',
  DENSITY: 'Density',
  VECTOR: 'Vector',
  COMPOUND: 'Compound',
  MOLECULE: 'Molecule',
  INSPIRATION: 'Inspiration',
  CROSS_REFERENCE: 'Cross reference',
  CLASS: 'Compound colour',
  SURFACE: 'Surface',
  QUALITY: 'Quality',
  SITE: 'Site',
  TARGET: 'Target',
  ALL: 'All',
  SELECTED_TYPE: 'Selected',
  LIGANDS: 'Ligands',
  SIDECHAINS: 'Sidechains',
  TAB: 'Tab',
  DATASET: 'Dataset',
  CUSTOM_VIEW: 'custom view',
  TAG: 'Tag',
  LIST_VIEW: 'list view',
  GRID_VIEW: 'grid view'
};

export const actionObjectType = {
  TARGET: 'TARGET',
  SITE: 'SITE',
  MOLECULE: 'MOLECULE',
  COMPOUND: 'COMPOUND',
  INSPIRATION: 'INSPIRATION',
  CROSS_REFERENCE: 'CROSS_REFERENCE',
  REPRESENTATION: 'REPRESENTATION',
  VIEWER_SETTINGS: 'VIEWER_SETTINGS',
  TAG: 'TAG'
};

export const actionAnnotation = {
  CHECK: 'CHECK',
  CLEAR: 'CLEAR',
  WARNING: 'WARNING',
  FAVORITE: 'FAVORITE',
  STAR: 'STAR'
};

export const mapTypesStrings = {
  EVENT: 'EVENT MAP',
  DIFF: 'DIFF MAP',
  SIGMAA: 'SIGMAA MAP'
};

export const viewerControlsSides = {
  LHS: 'Left hand side',
  RHS: 'Right hand side'
};

export const NUM_OF_SECONDS_TO_IGNORE_MERGE = 2;
