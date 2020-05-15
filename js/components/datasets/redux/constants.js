const prefix = 'CUSTOM_DATASETS_';

export const constants = {
  ADD_DATASET: prefix + 'ADD_DATASET',
  SET_DATASET: prefix + 'SET_DATASET',
  ADD_MOLECULELIST: prefix + 'ADD_MOLECULELIST',
  REMOVE_MOLECULELIST: prefix + 'REMOVE_MOLECULELIST',
  SET_IS_LOADING_MOLECULE_LIST: prefix + 'SET_IS_LOADING_MOLECULE_LIST',

  SET_FILTER_PROPERTY: prefix + 'SET_FILTER_PROPERTY',
  SET_FILTER_DIALOG_OPEN: prefix + 'SET_FILTER_DIALOG_OPEN',

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

  APPEND_TO_SCORE_DATASET_MAP: prefix + 'APPEND_TO_SCORE_DATASET_MAP',
  REMOVE_FROM_SCORE_DATASET_MAP: prefix + 'REMOVE_FROM_SCORE_DATASET_MAP',

  APPEND_TO_SCORE_COMPOUND_MAP: prefix + 'APPEND_TO_SCORE_COMPOUND_MAP',
  REMOVE_FROM_SCORE_COMPOUND_MAP: prefix + 'REMOVE_FROM_SCORE_COMPOUND_MAP',
  APPEND_TO_SCORE_COMPOUND_MAP_BY_SCORE_CATEGORY: prefix + 'APPEND_TO_SCORE_COMPOUND_MAP_BY_SCORE_CATEGORY',
  CLEAR_SCORE_COMPOUND_MAP: prefix + 'CLEAR_SCORE_COMPOUND_MAP',
  //filterShowedScoreProperties
  UPDATE_FILTER_SHOWED_SCORE_PROPERTIES: prefix + 'UPDATE_FILTER_SHOWED_SCORE_PROPERTIES',
  REMOVE_FROM_FILTER_SHOWED_SCORE_PROPERTIES: prefix + 'REMOVE_FROM_FILTER_SHOWED_SCORE_PROPERTIES'
};

export const COUNT_OF_VISIBLE_SCORES = 7;
