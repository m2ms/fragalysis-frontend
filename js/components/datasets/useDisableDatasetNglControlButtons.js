import { useSelector } from 'react-redux';

const useDisableDatasetNglControlButtons = selectedMolecules => {
  const disableDatasetsNglControlButtons = useSelector(
    state => state.datasetsReducers.disableDatasetsNglControlButtons
  );

  const selectedMoleculesControlButtons = [];
  selectedMolecules.forEach(molecule => {
    const disableMoleculeNglControlButtons = disableDatasetsNglControlButtons[molecule.datasetID]?.[molecule.id];
    if (disableMoleculeNglControlButtons) {
      selectedMoleculesControlButtons.push(disableMoleculeNglControlButtons);
    }
  });

  const ligandControlButtonDisabled = selectedMoleculesControlButtons.some(([_, buttonsState]) => buttonsState.ligand);
  const proteinControlButtonDisabled = selectedMoleculesControlButtons.some(
    ([_, buttonsState]) => buttonsState.protein
  );
  const complexControlButtonDisabled = selectedMoleculesControlButtons.some(
    ([_, buttonsState]) => buttonsState.complex
  );

  return {
    ligand: ligandControlButtonDisabled,
    protein: proteinControlButtonDisabled,
    complex: complexControlButtonDisabled
  };
};

export default useDisableDatasetNglControlButtons;
