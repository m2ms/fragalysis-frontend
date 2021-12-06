const prefix = 'CUSTOM_DATASETS_';

export const constants = {
  ADD_DATASET: prefix + 'ADD_DATASET',
  SET_DATASET: prefix + 'SET_DATASET',
  REPLACE_ALL_MOLECULELISTS: prefix + 'REPLACE_ALL_MOLECULELISTS',
  ADD_MOLECULELIST: prefix + 'ADD_MOLECULELIST',
  REMOVE_MOLECULELIST: prefix + 'REMOVE_MOLECULELIST',
  SET_IS_LOADING_MOLECULE_LIST: prefix + 'SET_IS_LOADING_MOLECULE_LIST',
  SET_SELECTED_DATASET_INDEX: prefix + 'SET_SELECTED_DATASET_INDEX',
  SET_TAB_VALUE: prefix + 'SET_TAB_VALUE',

  SET_FILTER_SETTINGS: prefix + 'SET_FILTER_SETTINGS',
  SET_FILTER_PROPERTIES: prefix + 'SET_FILTER_PROPERTIES',
  SET_FILTER_DIALOG_OPEN: prefix + 'SET_FILTER_DIALOG_OPEN',
  SET_FILTER_WITH_INSPIRATIONS: prefix + 'SET_FILTER_WITH_INSPIRATIONS',
  SET_DATASET_FILTER: prefix + 'SET_DATASET_FILTER',

  SET_LIGAND_LIST: prefix + 'SET_LIGAND_LIST',
  APPEND_LIGAND_LIST: prefix + 'APPEND_LIGAND_LIST',
  REMOVE_FROM_LIGAND_LIST: prefix + 'REMOVE_FROM_LIGAND_LIST',
  SET_PROTEIN_LIST: prefix + 'SET_PROTEIN_LIST',
  APPEND_PROTEIN_LIST: prefix + 'APPEND_PROTEIN_LIST',
  REMOVE_FROM_PROTEIN_LIST: prefix + 'REMOVE_FROM_PROTEIN_LIST',
  SET_COMPLEX_LIST: prefix + 'SET_COMPLEX_LIST',
  APPEND_COMPLEX_LIST: prefix + 'APPEND_COMPLEX_LIST',
  REMOVE_FROM_COMPLEX_LIST: prefix + 'REMOVE_FROM_COMPLEX_LIST',
  SET_SURFACE_LIST: prefix + 'SET_SURFACE_LIST',
  APPEND_SURFACE_LIST: prefix + 'APPEND_SURFACE_LIST',
  REMOVE_FROM_SURFACE_LIST: prefix + 'REMOVE_FROM_SURFACE_LIST',

  SET_INSPIRATION_LIST: prefix + 'SET_INSPIRATION_LIST',
  APPEND_INSPIRATION_LIST: prefix + 'APPEND_INSPIRATION_LIST',
  REMOVE_FROM_INSPIRATION_LIST: prefix + 'REMOVE_FROM_INSPIRATION_LIST',
  SET_ALL_INSPIRATIONS: prefix + 'SET_ALL_INSPIRATIONS',

  APPEND_TO_SCORE_DATASET_MAP: prefix + 'APPEND_TO_SCORE_DATASET_MAP',
  REMOVE_FROM_SCORE_DATASET_MAP: prefix + 'REMOVE_FROM_SCORE_DATASET_MAP',

  APPEND_TO_SCORE_COMPOUND_MAP: prefix + 'APPEND_TO_SCORE_COMPOUND_MAP',
  REMOVE_FROM_SCORE_COMPOUND_MAP: prefix + 'REMOVE_FROM_SCORE_COMPOUND_MAP',
  APPEND_TO_SCORE_COMPOUND_MAP_BY_SCORE_CATEGORY: prefix + 'APPEND_TO_SCORE_COMPOUND_MAP_BY_SCORE_CATEGORY',
  CLEAR_SCORE_COMPOUND_MAP: prefix + 'CLEAR_SCORE_COMPOUND_MAP',

  SET_FILTER_SHOWED_SCORE_PROPERTIES: prefix + 'SET_FILTER_SHOWED_SCORE_PROPERTIES',
  UPDATE_FILTER_SHOWED_SCORE_PROPERTIES: prefix + 'UPDATE_FILTER_SHOWED_SCORE_PROPERTIES',
  REMOVE_FROM_FILTER_SHOWED_SCORE_PROPERTIES: prefix + 'REMOVE_FROM_FILTER_SHOWED_SCORE_PROPERTIES',

  SET_SEARCH_STRING: prefix + 'SET_SEARCH_STRING',

  SET_IS_LOADING_INSPIRATION_LIST_OF_MOLECULES: prefix + 'SET_IS_LOADING_INSPIRATION_LIST_OF_MOLECULES',

  SET_IS_OPEN_INSPIRATION_DIALOG: prefix + 'SET_IS_OPEN_INSPIRATION_DIALOG',
  SET_IS_OPEN_CROSS_REFERENCE_DIALOG: prefix + 'SET_IS_OPEN_CROSS_REFERENCE_DIALOG',
  SET_CROSS_REFERENCE_COMPOUND_NAME: prefix + 'SET_CROSS_REFERENCE_COMPOUND_NAME',
  SET_IS_LOADING_CROSS_REFERENCE_SCORES: prefix + 'SET_IS_LOADING_CROSS_REFERENCE_SCORES',

  SET_INSPIRATION_FRAGMENT_LIST: prefix + 'SET_INSPIRATION_FRAGMENT_LIST',
  REMOVE_FROM_INSPIRATION_FRAGMENT_LIST: prefix + 'REMOVE_FROM_INSPIRATION_FRAGMENT_LIST',
  SET_INSPIRATION_MOLECULE_DATA_LIST: prefix + 'SET_INSPIRATION_MOLECULE_DATA_LIST',
  SET_ALL_INSPIRATION_MOLECULE_DATA_LIST: prefix + 'SET_ALL_INSPIRATION_MOLECULE_DATA_LIST',
  APPEND_TO_INSPIRATION_MOLECULE_DATA_LIST: prefix + 'APPEND_TO_INSPIRATION_MOLECULE_DATA_LIST',
  APPEND_TO_ALL_INSPIRATION_MOLECULE_DATA_LIST: prefix + 'APPEND_TO_ALL_INSPIRATION_MOLECULE_DATA_LIST',
  REMOVE_FROM_INSPIRATION_MOLECULE_DATA_LIST: prefix + 'REMOVE_FROM_INSPIRATION_MOLECULE_DATA_LIST',

  APPEND_MOLECULE_TO_COMPOUNDS_TO_BUY_OF_DATASET: prefix + 'APPEND_MOLECULE_TO_COMPOUNDS_TO_BUY_OF_DATASET',
  REMOVE_MOLECULE_FROM_COMPOUNDS_TO_BUY_OF_DATASET: prefix + 'REMOVE_MOLECULE_FROM_COMPOUNDS_TO_BUY_OF_DATASET',

  RELOAD_DATASETS_REDUCER: prefix + 'RELOAD_DATASETS_REDUCER',
  RESET_DATASETS_STATE: prefix + 'RESET_DATASETS_STATE',

  SET_SELECTED_ALL: prefix + 'SET_SELECTED_ALL',
  SET_DESELECTED_ALL: prefix + 'SET_DESELECTED_ALL',

  SET_SELECTED_ALL_BY_TYPE: prefix + 'SET_SELECTED_ALL_BY_TYPE',
  SET_DESELECTED_ALL_BY_TYPE: prefix + 'SET_DESELECTED_ALL_BY_TYPE',
  SET_ARROW_UP_DOWN: prefix + 'SET_ARROW_UP_DOWN',

  RESET_DRAG_DROP_STATE: prefix + 'RESET_DRAG_DROP_STATE',
  SET_DRAG_DROP_STATE: prefix + 'SET_DRAG_DROP_STATE'
};

export const COUNT_OF_VISIBLE_SCORES = 7;

export const createFilterSettingsObject = ({ active, predefined, priorityOrder }) => ({
  active,
  predefined,
  priorityOrder
});
