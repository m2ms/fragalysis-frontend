import { vectorCompoundsColors, constants } from './constants';

const defaultSelectedCmpdsClass = {
  [vectorCompoundsColors.blue.key]: [],
  [vectorCompoundsColors.red.key]: [],
  [vectorCompoundsColors.green.key]: [],
  [vectorCompoundsColors.purple.key]: [],
  [vectorCompoundsColors.apricot.key]: []
};

const defaultCompoundsClasses = {
  [vectorCompoundsColors.blue.key]: undefined,
  [vectorCompoundsColors.red.key]: undefined,
  [vectorCompoundsColors.green.key]: undefined,
  [vectorCompoundsColors.purple.key]: undefined,
  [vectorCompoundsColors.apricot.key]: undefined
};

export const INITIAL_STATE = {
  currentPage: -1,
  compoundsPerPage: 20,
  /* currentCompounds: [{
      smiles:"Cc1cc(CN(C)C(C)C(N)=O)no1",
      show_frag:"Cc1cc(CN(C)C(C)C(N)=O)no1",
      vector:"CC1CCC([101Xe])C1",
      mol:"CCNC(=O)Nc1cc(C)on1",
   }] */
  currentCompounds: [],
  currentCompoundClass: vectorCompoundsColors.blue.key,
  ...defaultCompoundsClasses,
  selectedCompoundsClass: defaultSelectedCmpdsClass,
  highlightedCompoundId: null,
  showedCompoundList: [],

  // configuration: {
  //  [id]: undefined
  // }
  configuration: {},
  allSelectedCompounds: {}
};

export const RESET_STATE = {
  currentPage: -1,
  compoundsPerPage: 20,
  /* currentCompounds: [{
      smiles:"Cc1cc(CN(C)C(C)C(N)=O)no1",
      show_frag:"Cc1cc(CN(C)C(C)C(N)=O)no1",
      vector:"CC1CCC([101Xe])C1",
      mol:"CCNC(=O)Nc1cc(C)on1",
   }] */
  currentCompounds: [],
  currentCompoundClass: vectorCompoundsColors.blue.key,
  ...defaultCompoundsClasses,
  selectedCompoundsClass: defaultSelectedCmpdsClass,
  highlightedCompoundId: null,
  showedCompoundList: [],

  // configuration: {
  //  [id]: undefined
  // }
  configuration: {}
};

export const vectorCompounds = (state = INITIAL_STATE, action = {}) => {
  switch (action.type) {
    case constants.SET_CURRENT_COMPOUNDS:
      return Object.assign({}, state, { currentCompounds: action.payload });

    case constants.SET_CURRENT_PAGE:
      return Object.assign({}, state, { currentPage: action.payload });

    case constants.UPDATE_COMPOUND:
      const currentCmpds = JSON.parse(JSON.stringify(state.currentCompounds));
      if (currentCmpds[action.payload.id] && action.payload.id && action.payload.key) {
        currentCmpds[action.payload.id][action.payload.key] = action.payload.value;
      }
      return Object.assign({}, state, { currentCompounds: currentCmpds });

    case constants.RESET_CURRENT_COMPOUNDS_SETTINGS:
      return Object.assign({}, INITIAL_STATE);

    case constants.RESET_CURRENT_COMPOUNDS_SETTINGS_WITHOUT_SELECTION:
      return Object.assign({}, state, RESET_STATE);

    case constants.SET_CURRENT_COMPOUND_CLASS:
      return Object.assign({}, state, {
        currentCompoundClass: action.payload
      });
    case constants.SET_COMPOUND_CLASSES:
      return Object.assign({}, state, {
        ...action.payload
      });

    case constants.RESET_COMPOUND_CLASSES:
      return Object.assign({}, state, { ...defaultCompoundsClasses });

    case constants.SET_HIGHLIGHTED_COMPOUND_ID:
      return Object.assign({}, state, { highlightedCompoundId: action.payload });

    case constants.SET_CONFIGURATION:
      const currentConfiguration = JSON.parse(JSON.stringify(state.configuration));
      currentConfiguration[action.payload.id] = action.payload.data;
      return Object.assign({}, state, { configuration: currentConfiguration });

    case constants.RESET_CONFIGURATION:
      return Object.assign({}, state, { configuration: {} });

    case constants.SET_SHOWED_COMPOUND_LIST:
      return Object.assign({}, state, { showedCompoundList: action.payload });

    case constants.APPEND_SHOWED_COMPOUND_LIST:
      const cmpdsList = new Set(state.showedCompoundList);
      cmpdsList.add(action.item.smiles);

      return Object.assign({}, state, {
        showedCompoundList: [...cmpdsList]
      });

    case constants.REMOVE_SHOWED_COMPOUND_LIST:
      const diminishedCmpdsList = new Set(state.showedCompoundList);
      diminishedCmpdsList.delete(action.item.smiles);
      return Object.assign({}, state, { showedCompoundList: [...diminishedCmpdsList] });

    case constants.APPEND_SELECTED_COMPOUND_CLASS:
      const selectedCmpdClass = JSON.parse(JSON.stringify(state.selectedCompoundsClass));
      Object.keys(selectedCmpdClass).forEach(classKey => {
        const diminishedCmpdsList = new Set(selectedCmpdClass[classKey]);
        diminishedCmpdsList.delete(action.payload.compoundID);
        selectedCmpdClass[classKey] = [...diminishedCmpdsList];
      });

      const currentClassList = new Set(selectedCmpdClass[action.payload.classID]);
      currentClassList.add(action.payload.compoundID);

      selectedCmpdClass[action.payload.classID] = [...currentClassList];

      return Object.assign({}, state, {
        selectedCompoundsClass: selectedCmpdClass
      });

    case constants.REMOVE_SELECTED_COMPOUND_CLASS:
      const diminishedSelectedCmpdClass = JSON.parse(JSON.stringify(state.selectedCompoundsClass));

      Object.keys(diminishedSelectedCmpdClass).forEach(classKey => {
        const currentClassList = new Set(diminishedSelectedCmpdClass[classKey]);
        currentClassList.delete(action.payload);
        diminishedSelectedCmpdClass[classKey] = [...currentClassList];
      });

      return Object.assign({}, state, {
        selectedCompoundsClass: diminishedSelectedCmpdClass
      });

    case constants.RESET_SELECTED_COMPOUND_CLASS:
      return Object.assign({}, state, {
        selectedCompoundsClass: defaultSelectedCmpdsClass
      });

    case constants.SET_SELECTED_COMPOUNDS:
      return { ...state, allSelectedCompounds: action.payload };

    case constants.RELOAD_REDUCER:
      return Object.assign({}, state, { ...action.payload });

    default:
      return state;
  }
};
