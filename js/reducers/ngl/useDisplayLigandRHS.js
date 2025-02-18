import { useCallback, useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { NglContext } from '../../components/nglView/nglProvider';
import { VIEWS } from '../../constants/constants';
import { NGL_OBJECTS } from './constants';
import { getToBeDisplayedStructuresDataset } from './utils';
import { getRandomColor } from '../../components/preview/molecule/utils/color';
import {
  appendLigandList,
  removeFromLigandList,
  removeFromToBeDisplayedListForDataset,
  updateInToBeDisplayedListForDataset
} from '../../components/datasets/redux/actions';
import { generateMoleculeCompoundId, generateMoleculeObject } from '../../components/nglView/generatingObjects';
import { deleteObject, loadObject } from './dispatchActions';

export const useDisplayLigandRHS = () => {
  const dispatch = useDispatch();

  const toBeDisplayedList = useSelector(state => state.datasetsReducers.toBeDisplayedList);
  const displayedLigands = useSelector(state => state.datasetsReducers.ligandLists);
  const allCompounds = useSelector(state => state.datasetsReducers.moleculeLists);

  const { getNglView } = useContext(NglContext);
  const stage = getNglView(VIEWS.MAJOR_VIEW) && getNglView(VIEWS.MAJOR_VIEW).stage;

  const displayLigand = useCallback(
    ligandData => {
      const datasetCompounds = allCompounds[ligandData.datasetID];
      const data = datasetCompounds?.find(obs => obs.id === ligandData.id);
      if (!data) return;
      const colourToggle = getRandomColor(data);
      const datasetID = ligandData.datasetID;

      dispatch(appendLigandList(datasetID, generateMoleculeCompoundId(data)));
      console.count(`Grabbed orientation before loading dataset ligand`);
      // const currentOrientation = stage.viewerControls.getOrientation();
      return dispatch(
        loadObject({
          target: Object.assign(
            { display_div: VIEWS.MAJOR_VIEW },
            generateMoleculeObject(data, colourToggle, datasetID)
          ),
          stage,
          previousRepresentations: ligandData.representations,
          markAsRightSideLigand: true
        })
      ).then(() => {
        dispatch(
          updateInToBeDisplayedListForDataset(datasetID, { id: data.id, rendered: true, type: NGL_OBJECTS.LIGAND })
        );
      });
    },
    [allCompounds, dispatch, stage]
  );

  const removeLigand = useCallback(
    ligandData => {
      const datasetCompounds = allCompounds[ligandData.datasetID];
      const data = datasetCompounds?.find(obs => obs.id === ligandData.id);
      if (!data) return;
      const datasetID = ligandData.datasetID;

      dispatch(
        deleteObject(
          Object.assign({ display_div: VIEWS.MAJOR_VIEW }, generateMoleculeObject(data, undefined, datasetID)),
          stage
        )
      );
      dispatch(removeFromLigandList(datasetID, generateMoleculeCompoundId(data)));

      dispatch(removeFromToBeDisplayedListForDataset(datasetID, { id: ligandData.id, type: NGL_OBJECTS.LIGAND }));
    },
    [allCompounds, dispatch, stage]
  );

  useEffect(() => {
    const toBeRemovedLigands = getToBeDisplayedStructuresDataset(
      toBeDisplayedList,
      displayedLigands,
      NGL_OBJECTS.LIGAND,
      true
    );
    toBeRemovedLigands?.forEach(data => {
      removeLigand(data);
    });
    const toBeDisplayedLigands = getToBeDisplayedStructuresDataset(
      toBeDisplayedList,
      displayedLigands,
      NGL_OBJECTS.LIGAND
    );
    toBeDisplayedLigands?.forEach(data => {
      displayLigand(data);
    });
  }, [toBeDisplayedList, displayedLigands, displayLigand, dispatch, stage, removeLigand]);

  return {};
};
