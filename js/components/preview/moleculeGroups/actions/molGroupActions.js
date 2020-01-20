import { generateComplex, generateMolecule, getJoinedMoleculeList } from '../../molecule/molecules_helpers';
import { VIEWS } from '../../../../constants/constants';
import { deleteObject } from '../../../../reducers/ngl/nglDispatchActions';

export const clearAfterDeselectingMoleculeGroup = ({ molGroupId, majorViewStage }) => (dispatch, getState) => {
  let site;
  const state = getState();
  const cached_mol_lists = state.apiReducers.present.cached_mol_lists;
  const mol_group_list = state.apiReducers.present.mol_group_list;
  const vector_list = state.selectionReducers.present.vector_list;

  // loop through all molecules
  getJoinedMoleculeList({ object_selection: [molGroupId], cached_mol_lists, mol_group_list }).forEach(mol => {
    site = mol.site;
    // remove Ligand
    dispatch(
      deleteObject(
        Object.assign({ display_div: VIEWS.MAJOR_VIEW }, generateMolecule(mol.id.toString(), mol.sdf_info)),
        majorViewStage
      )
    );

    // remove Complex
    dispatch(
      deleteObject(
        Object.assign(
          { display_div: VIEWS.MAJOR_VIEW },
          generateComplex(mol.id.toString(), mol.protein_code, mol.sdf_info, mol.molecule_protein)
        ),
        majorViewStage
      )
    );
  });

  // remove all Vectors
  vector_list
    .filter(v => v.site === site)
    .forEach(item => {
      dispatch(deleteObject(Object.assign({ display_div: VIEWS.MAJOR_VIEW }, item), majorViewStage));
    });
};
