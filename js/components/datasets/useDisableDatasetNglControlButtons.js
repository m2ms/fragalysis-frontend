import { useSelector } from 'react-redux';

const useDisableDatasetNglControlButtons = selectedMolecules => {
  const disableDatasetsNglControlButtons = useSelector(
    state => state.datasetsReducers.disableDatasetsNglControlButtons
  );

  const selectedMoleculesControlButtons = [];
  selectedMolecules.forEach(({ datasetID, molecule }) => {
    const disableMoleculeNglControlButtons = disableDatasetsNglControlButtons[datasetID]?.[molecule.id];
    if (disableMoleculeNglControlButtons) {
      selectedMoleculesControlButtons.push(disableMoleculeNglControlButtons);
    }
  });

  const ligandControlButtonDisabled = selectedMoleculesControlButtons.some(buttonsState => buttonsState.ligand);
  const proteinControlButtonDisabled = selectedMoleculesControlButtons.some(buttonsState => buttonsState.protein);
  const complexControlButtonDisabled = selectedMoleculesControlButtons.some(buttonsState => buttonsState.complex);

  return {
    ligand: ligandControlButtonDisabled,
    protein: proteinControlButtonDisabled,
    complex: complexControlButtonDisabled
  };
};

export default useDisableDatasetNglControlButtons;
