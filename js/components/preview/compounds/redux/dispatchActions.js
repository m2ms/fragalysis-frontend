import { appendToBuyList, removeFromToBuyList, setToBuyList } from '../../../../reducers/selection/selectionActions';
import { setCompoundClasses, setCurrentPage, setHighlighted, updateCurrentCompound } from './actions';
import { deleteObject, loadObject } from '../../../../reducers/ngl/nglDispatchActions';
import { VIEWS } from '../../../../constants/constants';
import { generateCompoundMolObject } from '../../../nglView/generatingObjects';
import { api, getCsrfToken, METHOD } from '../../../../utils/api';
import { base_url } from '../../../routes/constants';

export const selectAllCompounds = () => (dispatch, getState) => {
  const state = getState();
  const thisVectorList = state.selectionReducers.this_vector_list;
  const to_query = state.selectionReducers.to_query;
  const currentCompoundClass = state.previewReducers.compounds.currentCompoundClass;

  for (let key in thisVectorList) {
    for (let index in thisVectorList[key]) {
      if (index !== 'vector') {
        for (let fUCompound in thisVectorList[key][index]) {
          var thisObj = {
            smiles: thisVectorList[key][index][fUCompound].end,
            vector: thisVectorList[key].vector.split('_')[0],
            mol: to_query,
            class: parseInt(currentCompoundClass)
          };
          dispatch(appendToBuyList(thisObj));
        }
      }
    }
  }
};

export const clearAllSelectedCompounds = () => dispatch => {
  dispatch(setToBuyList([]));
};

export const onChangeCompoundClassValue = event => (dispatch, getState) => {
  const state = getState();
  const compoundClasses = state.previewReducers.compounds.compoundClasses;
  // on Enter
  if (event.keyCode === 13) {
    const newClassDescription = { [event.target.id]: event.target.value };
    const descriptionToSet = Object.assign(compoundClasses, newClassDescription);

    dispatch(setCompoundClasses(descriptionToSet, event.target.id));
  }
};

export const loadNextPageOfCompounds = () => (dispatch, getState) => {
  const nextPage = getState().previewReducers.compounds.currentPage + 1;
  dispatch(setCurrentPage(nextPage));
};

const showCompoundNglView = ({ majorViewStage, data }) => (dispatch, getState) => {
  if (isCompoundShowed) {
    dispatch(
      deleteObject(
        Object.assign({ display_div: VIEWS.MAJOR_VIEW }, generateCompoundMolObject(conf, data.smiles)),
        majorViewStage
      )
    );
  } else {
    // This needs currying
    var post_data = {
      INPUT_VECTOR: data.vector,
      INPUT_SMILES: [data.smiles],
      INPUT_MOL_BLOCK: to_query_sdf_info
    };
    api({
      url: base_url + '/scoring/gen_conf_from_vect/',
      method: METHOD.POST,
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRFToken': getCsrfToken()
      },
      data: JSON.stringify(post_data)
    })
      .then(response => {
        // Now load this into NGL
        const newConf = response.data[0];
        dispatch(
          loadObject(
            Object.assign({ display_div: VIEWS.MAJOR_VIEW }, generateCompoundMolObject(newConf, data.smiles)),
            majorViewStage
          )
        );
        setConf(newConf);
      })
      .catch(error => {
        throw error;
      });
  }
};

export const handleClickOnCompound = ({ data, event, setIsCompoundShowed, isCompoundShowed, majorViewStage }) => async (
  dispatch,
  getState
) => {
  const state = getState();
  const currentCompoundClass = state.previewReducers.compounds.currentCompoundClass;
  const currentCompounds = state.previewReducers.compounds.currentCompounds;

  dispatch(
    setHighlighted({
      index: data.index,
      smiles: data.smiles
    })
  );
  if (event.shiftKey) {
    setIsCompoundShowed(!isCompoundShowed);
    dispatch(showCompoundNglView({ majorViewStage, data }));
  } else {
    if (currentCompounds[data.index].selectedClass === currentCompoundClass) {
      dispatch(removeFromToBuyList(data));
    } else {
      await updateCurrentCompound({ id: data.index, key: 'selectedClass', value: currentCompoundClass });
      dispatch(appendToBuyList(data));
    }
  }
};

export const loadCompoundImageData = () => (dispatch, getState) => {};
