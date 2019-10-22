import React, { useState, memo } from 'react';
import { Grid, makeStyles, Button } from '@material-ui/core';
import BorderedView from './borderedView';
import NGLView from './nglComponents';
import MolGroupChecklist from './molGroupChecklist';
import ExpandMore from '@material-ui/icons/ExpandMore';
import ExpandLess from '@material-ui/icons/ExpandLess';
import * as apiActions from '../actions/apiActions';
import { connect } from 'react-redux';
import * as nglLoadActions from '../actions/nglLoadActions';
import { VIEWS } from './constants';
import * as selectionActions from '../actions/selectionActions';
import { generateMolId, generateMolObject, generateObject, getJoinedMoleculeList } from './molecules/helpers';
import { withLoadingMolGroupList } from '../hoc/withLoadingMolGroupList';

const useStyles = makeStyles(() => ({
  containerExpanded: {
    height: '208px',
    transition: 'height 0.2s'
  },
  containerCollapsed: {
    height: '0px',
    transition: 'height 0.2s'
  },
  nglViewItem: {
    paddingLeft: '4px'
  },
  checklistItem: {
    height: '100%'
  },
  button: {
    minWidth: 'unset'
  },
  sortFilterButtonStyle: {
    textTransform: 'none',
    fontWeight: 'bold',
    fontSize: 'larger'
  }
}));

const molGroupSelector = memo(
  ({
    setObjectOn,
    setObjectSelection,
    object_selection,
    cached_mol_lists,
    mol_group_list,
    deleteObject,
    removeFromFragmentDisplayList,
    removeFromComplexList,
    vector_list,
    removeFromVectorOnList
  }) => {
    const [expanded, setExpanded] = useState(true);
    const classes = useStyles();

    const handleTitleButtonClick = () => {
      setExpanded(!expanded);
    };

    const handleClearSelection = () => {
      // remove selected sites
      setObjectOn(undefined);
      setObjectSelection([]);

      // loop through all molecules
      getJoinedMoleculeList(object_selection, cached_mol_lists, mol_group_list, vector_list).forEach(mol => {
        // remove Ligand
        deleteObject(
          Object.assign({ display_div: VIEWS.MAJOR_VIEW }, generateMolObject(mol.id.toString(), mol.sdf_info))
        );
        removeFromFragmentDisplayList(generateMolId(mol.id.toString()));

        // remove Complex
        deleteObject(
          Object.assign(
            { display_div: VIEWS.MAJOR_VIEW },
            generateObject(mol.id.toString(), mol.protein_code, mol.sdf_info, mol.molecule_protein)
          )
        );
        removeFromComplexList(generateMolId(mol.id.toString()));

        // remove all Vectors
        removeFromVectorOnList(generateMolId(mol.id.toString()));
      });
      // remove all Vectors
      vector_list.forEach(item => deleteObject(Object.assign({ display_div: VIEWS.MAJOR_VIEW }, item)));

      // remove all selected values in hit navigator
    };

    const titleRightElement = (
      <div>
        <Button onClick={handleClearSelection} className={classes.button}>
          <span className={classes.sortFilterButtonStyle}>clear selection</span>
        </Button>
        <Button onClick={handleTitleButtonClick} className={classes.button}>
          {expanded ? <ExpandLess /> : <ExpandMore />}
        </Button>
      </div>
    );

    return (
      <BorderedView title="hit cluster selector" rightElement={titleRightElement}>
        <Grid
          item
          container
          alignItems="center"
          className={expanded ? classes.containerExpanded : classes.containerCollapsed}
        >
          <Grid item xs={5} className={classes.nglViewItem}>
            <NGLView div_id={VIEWS.SUMMARY_VIEW} height={expanded ? '200px' : '0px'} />
          </Grid>
          <Grid item xs={7} className={classes.checklistItem}>
            {expanded && <MolGroupChecklist />}
          </Grid>
        </Grid>
      </BorderedView>
    );
  }
);

function mapStateToProps(state) {
  return {
    object_selection: state.apiReducers.present.mol_group_selection,
    cached_mol_lists: state.apiReducers.present.cached_mol_lists,
    mol_group_list: state.apiReducers.present.mol_group_list,
    vector_list: state.selectionReducers.present.vector_list
  };
}
const mapDispatchToProps = {
  setObjectOn: apiActions.setMolGroupOn,
  setObjectSelection: apiActions.setMolGroupSelection,
  deleteObject: nglLoadActions.deleteObject,
  removeFromFragmentDisplayList: selectionActions.removeFromFragmentDisplayList,
  removeFromComplexList: selectionActions.removeFromComplexList,
  removeFromVectorOnList: selectionActions.removeFromVectorOnList
};
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withLoadingMolGroupList(molGroupSelector));
