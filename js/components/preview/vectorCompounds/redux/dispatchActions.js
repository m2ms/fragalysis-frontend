import {
  appendToBuyList,
  removeFromToBuyList,
  setToBuyList,
  appendToBuyListAll,
  removeFromToBuyListAll
} from '../../../../reducers/selection/actions';
import {
  setVectorCompoundClasses,
  setCurrentPage,
  setHighlightedVectorCompoundId,
  setConfiguration,
  addShownVectorCompoundToList,
  removeShownVectorCompoundFromList,
  removeSelectedVectorCompoundClass,
  addSelectedVectorCompoundClass,
  resetVectorCompoundClasses,
  resetSelectedVectorCompoundClass,
  resetConfiguration,
  setCurrentVectorCompoundClass,
  setSelectedVectorCompounds
} from './actions';
import { deleteObject, loadObject } from '../../../../reducers/ngl/dispatchActions';
import { VIEWS } from '../../../../constants/constants';
import { generateCompoundMolObject } from '../../../nglView/generatingObjects';
import { api, getCsrfToken, METHOD } from '../../../../utils/api';
import { base_url } from '../../../routes/constants';
import { loadFromServer } from '../../../../utils/genericView';
import { vectorCompoundsColors, AUX_VECTOR_SELECTOR_DATASET_ID } from './constants';
import {
  getCurrentVectorCompoundsFiltered,
  getMoleculeOfCurrentVector
} from '../../../../reducers/selection/selectors';
import {
  appendMoleculeToCompoundsOfDatasetToBuy,
  removeMoleculeFromCompoundsOfDatasetToBuy,
  updateFilterShowedScoreProperties
} from '../../../datasets/redux/actions';
import { isRemoteDebugging } from '../../../routes/constants';

export const selectAllVectorCompounds = () => (dispatch, getState) => {
  const state = getState();
  const currentVectorCompoundsFiltered = getCurrentVectorCompoundsFiltered(state);

  const moleculeOfVector = getMoleculeOfCurrentVector(state);
  const smiles = moleculeOfVector && moleculeOfVector.smiles;
  const currentCompoundClass = state.previewReducers.vectorCompounds.currentCompoundClass;
  const selectedCompounds = state.previewReducers.vectorCompounds.allSelectedCompounds;

  let items = [];

  let selectedCompoundsAux = { ...selectedCompounds };

  for (let key in currentVectorCompoundsFiltered) {
    for (let index in currentVectorCompoundsFiltered[key]) {
      if (index !== 'vector') {
        for (let indexOfCompound in currentVectorCompoundsFiltered[key][index]) {
          let compoundId = parseInt(indexOfCompound);
          var thisObj = {
            smiles: currentVectorCompoundsFiltered[key][index][indexOfCompound].end,
            vector: currentVectorCompoundsFiltered[key].vector.split('_')[0],
            mol: smiles,
            class: currentCompoundClass,
            compoundId: compoundId,
            compound_ids: [...currentVectorCompoundsFiltered[key][index][indexOfCompound].compound_ids]
          };

          thisObj['index'] = indexOfCompound;
          thisObj['compoundClass'] = currentCompoundClass;
          items.push(thisObj);
          dispatch(appendToBuyList(thisObj, compoundId, true));
          dispatch(addSelectedVectorCompoundClass(currentCompoundClass, compoundId));
          dispatch(appendMoleculeToCompoundsOfDatasetToBuy(AUX_VECTOR_SELECTOR_DATASET_ID, thisObj.smiles, '', true));
          selectedCompoundsAux[thisObj.smiles] = thisObj;
        }
      }
    }
  }

  dispatch(setSelectedVectorCompounds(selectedCompoundsAux));
  dispatch(appendToBuyListAll(items));
};

export const onChangeVectorCompoundClassValue = event => (dispatch, getState) => {
  const state = getState();
  const compoundClasses = {};
  Object.keys(vectorCompoundsColors).forEach(color => {
    compoundClasses[color] = state.previewReducers.vectorCompounds[color];
  });
  // const compoundClasses = state.previewReducers.vectorCompounds.compoundClasses;

  let id = event.target.id;
  let value = event.target.value;
  let oldDescriptionToSet = Object.assign({}, compoundClasses);
  const newClassDescription = {
    [id]: value
  };
  const descriptionToSet = Object.assign(compoundClasses, newClassDescription);

  dispatch(setVectorCompoundClasses(descriptionToSet, oldDescriptionToSet, value, id));
};

export const onKeyDownVectorCompoundClass = event => (dispatch, getState) => {
  const state = getState();

  // on Enter
  if (event.keyCode === 13) {
    let oldCompoundClass = state.previewReducers.vectorCompounds.currentCompoundClass;
    dispatch(setCurrentVectorCompoundClass(event.target.id, oldCompoundClass));
  }
};

export const loadNextPageOfVectorCompounds = () => (dispatch, getState) => {
  const nextPage = getState().previewReducers.vectorCompounds.currentPage + 1;
  dispatch(setCurrentPage(nextPage));
};

const showVectorCompoundNglView = ({ majorViewStage, data, index }) => (dispatch, getState) => {
  const state = getState();
  const moleculeOfVector = getMoleculeOfCurrentVector(state);
  const sdf_info = moleculeOfVector && moleculeOfVector.sdf_info;
  const configuration = state.previewReducers.vectorCompounds.configuration;
  const showedCompoundList = state.previewReducers.vectorCompounds.showedCompoundList;

  if (showedCompoundList.find(item => item === data.smiles) !== undefined) {
    dispatch(
      deleteObject(
        Object.assign(
          { display_div: VIEWS.MAJOR_VIEW },
          generateCompoundMolObject(configuration[index] || false, data.smiles)
        ),
        majorViewStage
      )
    );
  } else {
    // This needs currying
    var post_data = {
      INPUT_VECTOR: data.vector,
      INPUT_SMILES: [data.smiles],
      INPUT_MOL_BLOCK: sdf_info
    };

    let headersObj = {};
    if (isRemoteDebugging) {
      headersObj = {
        accept: 'application/json',
        'content-type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
        //'X-CSRFToken': getCsrfToken()
      };
    } else {
      headersObj = {
        accept: 'application/json',
        'content-type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRFToken': getCsrfToken()
      };
    }

    api({
      url: base_url + '/scoring/gen_conf_from_vect/',
      method: METHOD.POST,
      headers: headersObj,
      data: JSON.stringify(post_data)
    })
      .then(response => {
        // Now load this into NGL
        const newConf = response.data[0];
        dispatch(setConfiguration(index, newConf));
        return dispatch(
          loadObject({
            target: Object.assign({ display_div: VIEWS.MAJOR_VIEW }, generateCompoundMolObject(newConf, data.smiles)),
            stage: majorViewStage
          })
        );
      })
      .catch(error => {
        throw new Error(error);
      });
  }
};

export const clearAllSelectedVectorCompounds = majorViewStage => (dispatch, getState) => {
  const state = getState();

  let to_buy_list = state.selectionReducers.to_buy_list;
  dispatch(clearVectorCompounds(to_buy_list, majorViewStage));
};

const clearVectorCompounds = (items, majorViewStage) => (dispatch, getState) => {
  const state = getState();

  const selectedCompounds = state.previewReducers.vectorCompounds.allSelectedCompounds;

  let selectedCompoundsAux = { ...selectedCompounds };

  dispatch(removeFromToBuyListAll(items));
  dispatch(setToBuyList([]));
  items.forEach(item => {
    dispatch(removeMoleculeFromCompoundsOfDatasetToBuy(AUX_VECTOR_SELECTOR_DATASET_ID, item.smiles, '', true));
    if (selectedCompoundsAux[item.smiles]) {
      delete selectedCompoundsAux[item.smiles];
    }
  });

  dispatch(setSelectedVectorCompounds(selectedCompoundsAux));

  // reset objects from nglView and showedCompoundList
  const currentCompounds = state.previewReducers.vectorCompounds.currentCompounds;
  const showedCompoundList = state.previewReducers.vectorCompounds.showedCompoundList;
  showedCompoundList.forEach(smiles => {
    const data = currentCompounds.find(c => (c.smiles = smiles));
    const index = data.index;
    dispatch(showVectorCompoundNglView({ majorViewStage, data, index }));
    dispatch(removeShownVectorCompoundFromList(index));
  });
  //  reset compoundsClasses
  dispatch(resetVectorCompoundClasses());
  // reset selectedCompoundsClass
  dispatch(resetSelectedVectorCompoundClass());
  // reset highlightedCompoundId
  dispatch(setHighlightedVectorCompoundId(undefined));
  // reset configuration
  dispatch(resetConfiguration());
  // reset current compound class
  dispatch(
    dispatch(setCurrentVectorCompoundClass(vectorCompoundsColors.blue.key, vectorCompoundsColors.blue.key, true))
  );
};

export const prepareFakeFilterData = () => (dispatch, getState) => {
  dispatch(
    updateFilterShowedScoreProperties({
      datasetID: AUX_VECTOR_SELECTOR_DATASET_ID,
      scoreList: [
        { id: 1, name: 'smiles', description: 'smiles', computed_set: AUX_VECTOR_SELECTOR_DATASET_ID },
        { id: 2, name: 'mol', description: 'mol', computed_set: AUX_VECTOR_SELECTOR_DATASET_ID },
        { id: 3, name: 'vector', description: 'vector', computed_set: AUX_VECTOR_SELECTOR_DATASET_ID },
        { id: 4, name: 'class', description: 'class', computed_set: AUX_VECTOR_SELECTOR_DATASET_ID },
        { id: 5, name: 'compoundClass', description: 'compoundClass', computed_set: AUX_VECTOR_SELECTOR_DATASET_ID }
      ]
    })
  );
};

export const isVectorCompoundFromVectorSelector = data => {
  if (data['index'] !== undefined) {
    return true;
  } else {
    return false;
  }
};

export const deselectVectorCompound = data => (dispatch, getState) => {
  if (isVectorCompoundFromVectorSelector(data)) {
    const index = data['index'];

    const state = getState();
    const selectedCompounds = state.previewReducers.vectorCompounds.allSelectedCompounds;

    dispatch(removeSelectedVectorCompoundClass(index));
    dispatch(removeFromToBuyList(data, index));
    const selectedCompoundsCopy = { ...selectedCompounds };
    delete selectedCompoundsCopy[data.smiles];
    dispatch(setSelectedVectorCompounds(selectedCompoundsCopy));
  }
};

export const showHideLigand = (data, majorViewStage) => async (dispatch, getState) => {
  const state = getState();
  const showedCompoundList = state.previewReducers.vectorCompounds.showedCompoundList;

  const index = data.index;
  await dispatch(showVectorCompoundNglView({ majorViewStage, data, index }));
  if (showedCompoundList.find(item => item === data.smiles) !== undefined) {
    dispatch(removeShownVectorCompoundFromList(index, data));
  } else {
    dispatch(addShownVectorCompoundToList(index, data));
  }
};

export const handleClickOnVectorCompound = ({ event, data, majorViewStage, index }) => async (dispatch, getState) => {
  const state = getState();
  const currentCompoundClass = state.previewReducers.vectorCompounds.currentCompoundClass;
  const selectedCompoundsClass = state.previewReducers.vectorCompounds.selectedCompoundsClass;
  const selectedCompounds = state.previewReducers.vectorCompounds.allSelectedCompounds;

  dispatch(setHighlightedVectorCompoundId(index));

  if (event.shiftKey) {
    dispatch(showHideLigand(data, majorViewStage));
  } else {
    let isSelectedID;
    for (const classKey of Object.keys(selectedCompoundsClass)) {
      const currentCmpdClassId = selectedCompoundsClass[classKey].find(item => item === index);
      if (currentCmpdClassId !== undefined) {
        isSelectedID = currentCmpdClassId;
        break;
      }
    }

    if (isSelectedID !== undefined) {
      dispatch(removeSelectedVectorCompoundClass(index));
      dispatch(removeFromToBuyList(data, index));
      dispatch(removeMoleculeFromCompoundsOfDatasetToBuy(AUX_VECTOR_SELECTOR_DATASET_ID, data.smiles, '', true));
      const selectedCompoundsCopy = { ...selectedCompounds };
      delete selectedCompoundsCopy[data.smiles];
      dispatch(setSelectedVectorCompounds(selectedCompoundsCopy));
    } else {
      data['index'] = index;
      data['compoundClass'] = currentCompoundClass;
      dispatch(addSelectedVectorCompoundClass(currentCompoundClass, index));
      dispatch(appendToBuyList(Object.assign({}, data, { class: currentCompoundClass, compoundId: index }), index));
      dispatch(appendMoleculeToCompoundsOfDatasetToBuy(AUX_VECTOR_SELECTOR_DATASET_ID, data.smiles, '', true));
      const selectedCompoundsCopy = { ...selectedCompounds };
      selectedCompoundsCopy[data.smiles] = data;
      dispatch(setSelectedVectorCompounds(selectedCompoundsCopy));
    }
  }
};

export const handleBuyList = ({ isSelected, data, skipTracking }) => (dispatch, getState) => {
  const state = getState();
  const selectedCompounds = state.previewReducers.vectorCompounds.allSelectedCompounds;

  let compoundId = data.compoundId;
  dispatch(setHighlightedVectorCompoundId(compoundId));

  if (isSelected === false) {
    dispatch(removeSelectedVectorCompoundClass(compoundId));
    dispatch(removeFromToBuyList(data, compoundId, skipTracking));
    dispatch(removeMoleculeFromCompoundsOfDatasetToBuy(AUX_VECTOR_SELECTOR_DATASET_ID, data.smiles, '', true));
    const selectedCompoundsCopy = { ...selectedCompounds };
    delete selectedCompoundsCopy[data.smiles];
    dispatch(setSelectedVectorCompounds(selectedCompoundsCopy));
  } else {
    dispatch(addSelectedVectorCompoundClass(data.class, compoundId));
    dispatch(appendToBuyList(Object.assign({}, data), compoundId, skipTracking));
    dispatch(appendMoleculeToCompoundsOfDatasetToBuy(AUX_VECTOR_SELECTOR_DATASET_ID, data.smiles, '', true));
    const selectedCompoundsCopy = { ...selectedCompounds };
    selectedCompoundsCopy[data.smiles] = data;
    dispatch(setSelectedVectorCompounds(selectedCompoundsCopy));
  }
};

export const handleBuyListAll = ({ isSelected, items, majorViewStage }) => (dispatch, getState) => {
  if (isSelected === false) {
    dispatch(clearVectorCompounds(items, majorViewStage));
  } else {
    dispatch(selectAllVectorCompounds());
  }
};

export const handleShowVectorCompound = ({ isSelected, data, majorViewStage }) => async (dispatch, getState) => {
  const index = data.index;
  await dispatch(showVectorCompoundNglView({ majorViewStage, data, index }));
  if (isSelected === false) {
    dispatch(removeShownVectorCompoundFromList(index, data));
  } else {
    dispatch(addShownVectorCompoundToList(index, data));
  }
};

export const loadVectorCompoundImageData = ({ width, height, onCancel, data, setImage }) => {
  let url = undefined;
  let key = undefined;

  if (data.id !== undefined) {
    url = new URL(base_url + '/api/cmpdimg/' + data.id + '/');
    key = 'cmpd_image';
  } else {
    url = new URL(base_url + '/viewer/img_from_smiles/');
    var get_params = { smiles: data.show_frag };
    Object.keys(get_params).forEach(p => url.searchParams.append(p, get_params[p]));
  }

  return loadFromServer({
    width,
    height,
    key,
    setImg_data: image => setImage(image),
    url,
    cancel: onCancel
  });
};
