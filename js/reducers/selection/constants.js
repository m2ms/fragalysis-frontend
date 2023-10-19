const prefix = 'REDUCERS_SELECTION_';

export const constants = {
  SET_OBJECT_SELECTION: prefix + 'SET_OBJECT_SELECTION',

  SET_TO_BUY_LIST: prefix + 'SET_TO_BUY_LIST',
  APPEND_TO_BUY_LIST: prefix + 'APPEND_TO_BUY_LIST',
  APPEND_TO_BUY_LIST_ALL: prefix + 'APPEND_TO_BUY_LIST_ALL',
  REMOVE_FROM_TO_BUY_LIST: prefix + 'REMOVE_FROM_TO_BUY_LIST',
  REMOVE_FROM_BUY_LIST_ALL: prefix + 'REMOVE_FROM_BUY_LIST_ALL',
  SET_VECTOR_LIST: prefix + 'SET_VECTOR_LIST',
  SET_CURRENT_VECTOR: prefix + 'SET_CURRENT_VECTOR',
  SET_FRAGMENT_DISPLAY_LIST: prefix + 'SET_FRAGMENT_DISPLAY_LIST',
  APPEND_FRAGMENT_DISPLAY_LIST: prefix + 'APPEND_FRAGMENT_DISPLAY_LIST',
  REMOVE_FROM_FRAGMENT_DISPLAY_LIST: prefix + 'REMOVE_FROM_FRAGMENT_DISPLAY_LIST',
  SET_PROTEIN_LIST: prefix + 'SET_PROTEIN_LIST',
  APPEND_PROTEIN_LIST: prefix + 'APPEND_PROTEIN_LIST',
  REMOVE_FROM_PROTEIN_LIST: prefix + 'REMOVE_FROM_PROTEIN_LIST',
  SET_COMPLEX_LIST: prefix + 'SET_COMPLEX_LIST',
  APPEND_COMPLEX_LIST: prefix + 'APPEND_COMPLEX_LIST',
  REMOVE_FROM_COMPLEX_LIST: prefix + 'REMOVE_FROM_COMPLEX_LIST',
  SET_SURFACE_LIST: prefix + 'SET_SURFACE_LIST',
  APPEND_SURFACE_LIST: prefix + 'APPEND_SURFACE_LIST',
  REMOVE_FROM_SURFACE_LIST: prefix + 'REMOVE_FROM_SURFACE_LIST',
  SET_DENSITY_LIST: prefix + 'SET_DENSITY_LIST',
  APPEND_DENSITY_LIST: prefix + 'APPEND_DENSITY_LIST',
  REMOVE_FROM_DENSITY_LIST: prefix + 'REMOVE_FROM_DENSITY_LIST',

  SET_DENSITY_LIST_CUSTOM: prefix + 'SET_DENSITY_LIST_CUSTOM',
  APPEND_DENSITY_LIST_CUSTOM: prefix + 'APPEND_DENSITY_LIST_CUSTOM',
  REMOVE_FROM_DENSITY_LIST_CUSTOM: prefix + 'REMOVE_FROM_DENSITY_LIST_CUSTOM',
  SET_QUALITY_LIST: prefix + 'SET_QUALITY_LIST',
  APPEND_QUALITY_LIST: prefix + 'APPEND_QUALITY_LIST',
  REMOVE_FROM_QUALITY_LIST: prefix + 'REMOVE_FROM_QUALITY_LIST',

  SET_DISPLAY_ALL_NGL_LIST: prefix + 'SET_DISPLAY_ALL_NGL_LIST',
  APPEND_TO_DISPLAY_ALL_NGL_LIST: prefix + 'APPEND_TO_DISPLAY_ALL_NGL_LIST',
  REMOVE_FROM_DISPLAY_ALL_NGL_LIST: prefix + 'REMOVE_FROM_DISPLAY_ALL_NGL_LIST',

  APPEND_INFORMATION_LIST: prefix + 'APPEND_INFORMATION_LIST',
  REMOVE_FROM_INFORMATION_LIST: prefix + 'REMOVE_FROM_INFORMATION_LIST',
  SET_VECTOR_ON_LIST: prefix + 'SET_VECTOR_ON_LIST',
  APPEND_VECTOR_ON_LIST: prefix + 'APPEND_VECTOR_ON_LIST',
  REMOVE_FROM_VECTOR_ON_LIST: prefix + 'REMOVE_FROM_VECTOR_ON_LIST',
  RELOAD_SELECTION_REDUCER: prefix + 'RELOAD_SELECTION_REDUCER',
  RESET_SELECTION_STATE: prefix + 'RESET_SELECTION_STATE',
  SET_MOL_GROUP_SELECTION: prefix + 'SET_MOL_GROUP_SELECTION',
  SET_FILTER: prefix + 'SET_FILTER',
  SET_TARGET_FILTER: prefix + 'SET_TARGET_FILTER',
  SET_SELECTED_ALL: prefix + 'SET_SELECTED_ALL',
  SET_DESELECTED_ALL: prefix + 'SET_DESELECTED_ALL',
  SET_SELECTED_BY_TYPE: prefix + 'SET_SELECTED_BY_TYPE',
  SET_DESELECTED_ALL_BY_TYPE: prefix + 'SET_DESELECTED_ALL_BY_TYPE',
  SET_HIDE_ALL: prefix + 'SET_HIDE_ALL',
  SET_ARROW_UP_DOWN: prefix + 'SET_ARROW_UP_DOWN',
  APPEND_DENSITY_TYPE: prefix + 'APPEND_DENSITY_TYPE',
  REMOVE_DENSITY_TYPE: prefix + 'REMOVE_DENSITY_TYPE',

  SET_SELECTED_TAG_LIST: prefix + 'SET_SELECTED_TAG_LIST',
  APPEND_SELECTED_TAG_LIST: prefix + 'APPEND_SELECTED_TAG_LIST',
  REMOVE_FROM_SELECTED_TAG_LIST: prefix + 'REMOVE_FROM_SELECTED_TAG_LIST',
  SET_TAG_EDITOR_OPEN: prefix + 'SET_TAG_EDITOR_OPEN',
  SET_MOLECULE_FOR_TAG_EDIT: prefix + 'SET_MOLECULE_FOR_TAG_EDIT',
  SWITCH_TAG_FILTERING_MODE: prefix + 'SWITCH_TAG_FILTERING_MODE',

  RESET_COMPOUNDS_OF_VECTORS: prefix + 'RESET_COMPOUNDS_OF_VECTORS',
  UPDATE_VECTOR_COMPOUNDS: prefix + 'UPDATE_VECTOR_COMPOUNDS',
  RESET_BOND_COLOR_MAP_OF_VECTORS: prefix + 'RESET_BOND_COLOR_MAP_OF_VECTORS',
  UPDATE_BOND_COLOR_MAP_OF_COMPOUNDS: prefix + 'UPDATE_BOND_COLOR_MAP_OF_COMPOUNDS',
  SET_IS_TAG_GLOBAL_EDIT: prefix + 'SET_IS_TAG_GLOBAL_EDIT',
  SET_MOL_LIST_TO_EDIT: prefix + 'SET_MOL_LIST_TO_EDIT',
  APPEND_TO_MOL_LIST_TO_EDIT: prefix + 'APPEND_TO_MOL_LIST_TO_EDIT',
  REMOVE_FROM_MOL_LIST_TO_EDIT: prefix + 'REMOVE_FROM_MOL_LIST_TO_EDIT',

  SET_TAG_TO_EDIT: prefix + 'SET_TAG_TO_EDIT',
  SET_DISPLAY_ALL_MOLECULES: prefix + 'SET_DISPLAY_ALL_MOLECULES',
  SET_DISPLAY_UNTAGGED_MOLECULES: prefix + 'SET_DISPLAY_UNTAGGED_MOLECULES',
  SET_SELECT_ALL_MOLECULES: prefix + 'SET_SELECT_ALL_MOLECULES',
  SET_UNSELECT_ALL_MOLECULES: prefix + 'SET_UNSELECT_ALL_MOLECULES',
  SET_NEXT_X_MOLECULES: prefix + 'SET_NEXT_X_MOLECULES',

  SET_ASSIGN_TAGS_VIEW: prefix + 'SET_ASSIGN_TAGS_VIEW',

  SET_TAG_DETAIL_VIEW: prefix + 'SET_TAG_DETAIL_VIEW',

  SET_RESIZABLE_LAYOUT: prefix + 'SET_RESIZABLE_LAYOUT',

  SET_RHS_WIDTH: prefix + 'SET_RHS_WIDTH'
};

export const PREDEFINED_FILTERS = {
  none: {
    name: 'None',
    filter: undefined
  },
  rule_of_5: {
    name: 'Rule of 5',
    filter: {
      Hdon: 5,
      Hacc: 10,
      MW: 500,
      logP: 5
    }
  },
  rule_of_3: {
    name: 'Rule of 3',
    filter: {
      Hdon: 3,
      Hacc: 3,
      MW: 300,
      logP: 3
    }
  }
};

/**
 * Get key of default filter
 */
export const DEFAULT_FILTER = 'none';
