import { deleteObject, loadObject, setOrientation } from '../../../reducers/ngl/dispatchActions';
import {
  setFilterProperty,
  appendLigandList,
  appendProteinList,
  appendComplexList,
  appendSurfaceList,
  removeFromLigandList,
  removeFromProteinList,
  removeFromComplexList,
  removeFromSurfaceList,
  setDataset,
  setMoleculeList,
  appendToScoreDatasetMap,
  appendToScoreCompoundMap,
  appendToScoreCompoundMapByScoreCategory
} from './actions';
import { base_url } from '../../routes/constants';
import {
  generateMoleculeId,
  generateHitProteinObject,
  generateComplexObject,
  generateSurfaceObject,
  generateMoleculeObject
} from '../../nglView/generatingObjects';
import { VIEWS } from '../../../constants/constants';
import { MOL_ATTRIBUTES } from '../../preview/molecule/redux/constants';

import { addMoleculeList } from './actions';
import { api } from '../../../utils/api';
import { getInitialDatasetFilterObject, scoreListOfMolecules } from './selectors';

export const initializeDatasetMoleculeLists = moleculeList => (dispatch, getState) => {
  console.log('initializing testing datasets');
  const state = getState();
  const customDatasets = state.datasetsReducers.datasets;
  const testingMoleculeList = moleculeList.slice(0, 6);
  // TODO temporarily, just adding testing data
  customDatasets.forEach(dataset => {
    dispatch(
      addMoleculeList(
        dataset.id,
        (testingMoleculeList => {
          const newList = [];
          testingMoleculeList.forEach(molecule => {
            // molecule.protein_code is used as prefix for element names in display controls
            newList.push(Object.assign({}, molecule, { protein_code: dataset.id + '_' + molecule.id }));
          });
          return newList;
        })(testingMoleculeList)
      )
    );
  });
};

export const getListedMolecules = (object_selection, cached_mol_lists) => {
  let molecules = [];
  if ((object_selection || []).length) {
    for (let molgroupId of object_selection) {
      // Selected molecule groups
      const molGroup = cached_mol_lists[molgroupId];
      if (molGroup) {
        molecules = molecules.concat(molGroup);
      } else {
        console.log(`Molecule group ${molgroupId} not found in cached list`);
      }
    }
  }

  return molecules;
};

export const initializeDatasetFilter = datasetID => (dispatch, getState) => {
  const initObject = getInitialDatasetFilterObject(getState(), datasetID);
  dispatch(setFilterProperty(datasetID, initObject));
  return initObject;
};

export const addProtein = (stage, data, colourToggle, datasetID) => dispatch => {
  dispatch(
    loadObject(
      Object.assign({ display_div: VIEWS.MAJOR_VIEW }, generateHitProteinObject(data, colourToggle, base_url)),
      stage,
      undefined,
      null
    )
  ).finally(() => {
    const currentOrientation = stage.viewerControls.getOrientation();
    dispatch(setOrientation(VIEWS.MAJOR_VIEW, currentOrientation));
  });
  dispatch(appendProteinList(datasetID, generateMoleculeId(data)));
};

export const removeProtein = (stage, data, colourToggle, datasetID) => dispatch => {
  dispatch(
    deleteObject(
      Object.assign({ display_div: VIEWS.MAJOR_VIEW }, generateHitProteinObject(data, colourToggle, base_url)),
      stage
    )
  );
  dispatch(removeFromProteinList(datasetID, generateMoleculeId(data)));
};

export const addComplex = (stage, data, colourToggle, datasetID) => dispatch => {
  dispatch(
    loadObject(
      Object.assign({ display_div: VIEWS.MAJOR_VIEW }, generateComplexObject(data, colourToggle, base_url)),
      stage,
      undefined,
      null
    )
  ).finally(() => {
    const currentOrientation = stage.viewerControls.getOrientation();
    dispatch(setOrientation(VIEWS.MAJOR_VIEW, currentOrientation));
  });
  dispatch(appendComplexList(datasetID, generateMoleculeId(data)));
};

export const removeComplex = (stage, data, colourToggle, datasetID) => dispatch => {
  dispatch(
    deleteObject(
      Object.assign({ display_div: VIEWS.MAJOR_VIEW }, generateComplexObject(data, colourToggle, base_url)),
      stage
    )
  );
  dispatch(removeFromComplexList(datasetID, generateMoleculeId(data)));
};

export const addSurface = (stage, data, colourToggle, datasetID) => dispatch => {
  dispatch(
    loadObject(
      Object.assign({ display_div: VIEWS.MAJOR_VIEW }, generateSurfaceObject(data, colourToggle, base_url)),
      stage,
      undefined,
      null
    )
  ).finally(() => {
    const currentOrientation = stage.viewerControls.getOrientation();
    dispatch(setOrientation(VIEWS.MAJOR_VIEW, currentOrientation));
  });
  dispatch(appendSurfaceList(datasetID, generateMoleculeId(data)));
};

export const removeSurface = (stage, data, colourToggle, datasetID) => dispatch => {
  dispatch(
    deleteObject(
      Object.assign({ display_div: VIEWS.MAJOR_VIEW }, generateSurfaceObject(data, colourToggle, base_url)),
      stage
    )
  );
  dispatch(removeFromSurfaceList(datasetID, generateMoleculeId(data)));
};

export const addLigand = (stage, data, colourToggle, datasetID) => dispatch => {
  dispatch(
    loadObject(
      Object.assign({ display_div: VIEWS.MAJOR_VIEW }, generateMoleculeObject(data, colourToggle)),
      stage,
      undefined,
      undefined
    )
  ).finally(() => {
    const currentOrientation = stage.viewerControls.getOrientation();
    dispatch(setOrientation(VIEWS.MAJOR_VIEW, currentOrientation));
  });
  dispatch(appendLigandList(datasetID, generateMoleculeId(data)));
};

export const removeLigand = (stage, data, colourToggle, datasetID) => dispatch => {
  dispatch(deleteObject(Object.assign({ display_div: VIEWS.MAJOR_VIEW }, generateMoleculeObject(data)), stage));
  dispatch(removeFromLigandList(datasetID, generateMoleculeId(data)));
};

export const loadDataSets = () => dispatch =>
  api({ url: `${base_url}/api/compound-sets/` }).then(response => {
    dispatch(setDataset(response.data.results.map(ds => ({ id: ds.id, title: ds.name }))));
  });

export const loadMoleculesOfDataSet = dataSetID => dispatch =>
  api({ url: `${base_url}/api/compound-molecules/?compound_set=${dataSetID}` }).then(response => {
    dispatch(addMoleculeList(dataSetID, response.data.results));
  });

export const loadCompoundScoresListOfDataSet = datasetID => dispatch =>
  api({ url: `${base_url}/api/compound-scores/?compound_set=${datasetID}` }).then(response => {
    dispatch(appendToScoreDatasetMap(datasetID, response.data.results));
    return Promise.all(
      response &&
        response.data &&
        response.data.results.map(score => dispatch(loadNumericalScoreListByScoreID(score.id)))
    );
  });

export const loadCompoundScoreList = (compoundID, onCancel) => dispatch =>
  api({ url: `${base_url}/api/numerical-scores/?compound=${compoundID}`, cancel: onCancel }).then(response => {
    dispatch(appendToScoreCompoundMap(compoundID, response.data.results));
  });

export const loadNumericalScoreListByScoreID = (scoreID, onCancel) => (dispatch, getState) =>
  api({ url: `${base_url}/api/numerical-scores/?score=${scoreID}`, cancel: onCancel }).then(response => {
    dispatch(appendToScoreCompoundMapByScoreCategory(response.data.results));
  });
