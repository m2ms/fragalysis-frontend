import { constants } from './constants';

export const setCurrentVectorCompounds = loadedCompounds => ({
  type: constants.SET_CURRENT_COMPOUNDS,
  payload: loadedCompounds
});

export const setCurrentPage = page => ({
  type: constants.SET_CURRENT_PAGE,
  payload: page
});

export const resetCurrentVectorCompoundsSettings = (withCompoundClasses = false) => async dispatch => {
  await dispatch({
    type: constants.RESET_CURRENT_COMPOUNDS_SETTINGS
  });

  if (withCompoundClasses === true) {
    dispatch(resetVectorCompoundClasses());
  }
};

export const resetCurrentVectorCompoundSettingsWithoutSelection = (withCompoundClasses = false) => async dispatch => {
  await dispatch({
    type: constants.RESET_CURRENT_COMPOUNDS_SETTINGS_WITHOUT_SELECTION
  });

  if (withCompoundClasses === true) {
    dispatch(resetVectorCompoundClasses());
  }
};

export const updateCurrentVectorCompound = ({ id, key, value }) => ({
  type: constants.UPDATE_COMPOUND,
  payload: {
    id,
    key,
    value
  }
});

export const setVectorCompoundClasses = (compoundClasses, oldCompoundClasses, value, id) => ({
  type: constants.SET_COMPOUND_CLASSES,
  payload: compoundClasses,
  oldCompoundClasses: oldCompoundClasses,
  value: value,
  id: id
});

export const resetVectorCompoundClasses = compoundClasses => ({
  type: constants.RESET_COMPOUND_CLASSES,
  payload: compoundClasses
});

export const setCurrentVectorCompoundClass = (currentCompoundClass, oldCompoundClass, skipTracking) => {
  return {
    type: constants.SET_CURRENT_COMPOUND_CLASS,
    payload: currentCompoundClass,
    oldCompoundClass: oldCompoundClass,
    skipTracking: skipTracking
  };
};

export const setHighlightedVectorCompoundId = id => ({ type: constants.SET_HIGHLIGHTED_COMPOUND_ID, payload: id });

export const setConfiguration = (id, data) => ({ type: constants.SET_CONFIGURATION, payload: { id, data } });

export const resetConfiguration = () => ({ type: constants.RESET_CONFIGURATION });

export const setShownVectorCompoundList = compounds => ({
  type: constants.SET_SHOWED_COMPOUND_LIST,
  payload: compounds
});

export const addShownVectorCompoundToList = (compoundId, item) => ({
  type: constants.APPEND_SHOWED_COMPOUND_LIST,
  payload: compoundId,
  item: item
});

export const removeShownVectorCompoundFromList = (compoundId, item) => ({
  type: constants.REMOVE_SHOWED_COMPOUND_LIST,
  payload: compoundId,
  item: item
});

export const addSelectedVectorCompoundClass = (classID, compoundID) => ({
  type: constants.APPEND_SELECTED_COMPOUND_CLASS,
  payload: { classID, compoundID }
});

export const removeSelectedVectorCompoundClass = compoundID => ({
  type: constants.REMOVE_SELECTED_COMPOUND_CLASS,
  payload: compoundID
});

export const resetSelectedVectorCompoundClass = () => ({
  type: constants.RESET_SELECTED_COMPOUND_CLASS
});

export const reloadVectorCompoundsReducer = newState => ({
  type: constants.RELOAD_REDUCER,
  payload: newState
});

export const setSelectedVectorCompounds = selectedCompounds => ({
  type: constants.SET_SELECTED_COMPOUNDS,
  payload: selectedCompounds
});
