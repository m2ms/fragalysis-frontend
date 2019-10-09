/**
 * Created by abradley on 14/03/2018.
 */

import { Grid, withStyles, Chip, Tooltip, Button } from "@material-ui/core";
import {GenericList} from "./generalComponents";
import React from "react";
import {connect} from "react-redux";
import * as apiActions from "../actions/apiActions";
import * as listType from "./listTypes";
import * as nglLoadActions from "../actions/nglLoadActions";
import MoleculeView from "./moleculeView";
import BorderedView from "./borderedView";
import classNames from "classnames";
import MoleculeListSortFilterDialog, { filterMolecules, getAttrDefinition } from "./moleculeListSortFilterDialog";
import {getJoinedMoleculeList} from "./molecules/helpers";

const styles = (theme) => ({
    container: {
        height: '100%',
        width: '100%',
        color: 'black'
    },
    gridItemHeader: {
        height: '32px',
        fontSize: '8px',
        color: '#7B7B7B'
    },
    gridItemHeaderVert: {
        width: '24px',
        transform: 'rotate(-90deg)'
    },
    gridItemHeaderHoriz: {
        width: 'calc((100% - 48px) * 0.3)',
    },
    gridItemHeaderHorizWider: {
        width: 'calc((100% - 48px) * 0.4)',
    },
    gridItemList: {
        overflow: 'auto',
        // - 48px for title and header items
        height: 'calc(100% - 48px)'
    },
    centered: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    sortFilterButtonStyle: {
        textTransform: 'none',
        fontWeight: 'bold',
        fontSize: 'larger',
    },
    filtersRow: {
        display: 'flex',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
      },
    filterChip: {
        marginBottom: theme.spacing(1),
        fontWeight: 'bolder',
        fontSize: '1rem',
    },
    filterTooltip: {
        fontSize: '1rem',
    },
    button: {
        minWidth: 'unset'
    },
    buttonActive: {
        border: 'solid 1px #009000',
        color: '#009000',
        '&:hover': {
            backgroundColor: '#E3EEDA',
            borderColor: '#003f00',
            color: '#003f00',
        }
    },
});

class MoleculeList extends GenericList {

    constructor(props) {
        super(props);
        this.list_type = listType.MOLECULE;
        this.state = {
            sortDialogOpen: false
        }
        this.filterSettings = undefined;
    }

    handleOptionChange(changeEvent) {
        const new_value = changeEvent.target.value;
        this.props.setObjectOn(new_value);
    }

    handleDialog = () => (open) => {
        this.setState({
            sortDialogOpen: open
        });
    }

    handleDialogClose = (filter) => {
        this.filterSettings = filter;
        this.handleDialog(false)();
    }

    render() {
        const { sortDialogOpen } = this.state;
        const { classes, object_selection, height, cached_mol_lists, mol_group_list} = this.props;
        const imgHeight = 80;
        const imgWidth = 100;

        let joinedMoleculeLists =  getJoinedMoleculeList(object_selection, cached_mol_lists, mol_group_list);


        if(!!(this.filterSettings || {}).active) {
            joinedMoleculeLists = useMemo(()=>filterMolecules(joinedMoleculeLists, this.filterSettings),[joinedMoleculeLists, this.filterSettings]);
        } else {
            joinedMoleculeLists.sort((a, b) => a.site - b.site);
        }

        const titleRightElement = <Button 
            onClick={this.handleDialog(open)} 
            className={classNames(classes.button, {[classes.buttonActive]: !!(this.filterSettings || {}).active})} 
            disabled={!(object_selection || []).length}><span className={classes.sortFilterButtonStyle}>sort/filter</span></Button>

        return (
            <div>
            {  !!(this.filterSettings || {}).active && 
                <div>Filters:<br/>
                    <div className={classes.filtersRow}>
                        {this.filterSettings.priorityOrder.map( attr => 
                            <Tooltip key={`Mol-Tooltip-${attr}`} classes={{tooltip: classes.filterTooltip}} title={`${this.filterSettings.filter[attr].minValue}-${this.filterSettings.filter[attr].maxValue} ${this.filterSettings.filter[attr].order === 1 ? '\u2191' : '\u2193'}`} placement="top">
                                <Chip size="small" label={attr} className={classes.filterChip} style={{backgroundColor: getAttrDefinition(attr).color}}/>
                            </Tooltip>
                        )}
                    </div>
                </div>
            }
            <BorderedView title="hit navigator" rightElement={titleRightElement}>
                { sortDialogOpen && <MoleculeListSortFilterDialog 
                    handleClose={this.handleDialogClose} 
                    molGroupSelection={this.props.object_selection} 
                    cachedMolList={this.props.cached_mol_lists}
                    filterSettings={this.filterSettings}/> }
                <Grid container direction="column" className={classes.container} style={{ height: height }}>
                    <Grid item container className={classes.gridItemHeader}>
                        <Grid item className={classNames(classes.gridItemHeaderVert, classes.centered)}>
                            site
                        </Grid>
                        <Grid item className={classNames(classes.gridItemHeaderVert, classes.centered)}>
                            cont.
                        </Grid>
                        <Grid item container direction="column" justify="center" alignItems="center" className={classes.gridItemHeaderHoriz}>
                            <Grid item>code</Grid>
                            <Grid item>status</Grid>
                        </Grid>
                        <Grid item className={classNames(classes.gridItemHeaderHoriz, classes.centered)}>
                            image
                        </Grid>
                        <Grid item className={classNames(classes.gridItemHeaderHorizWider, classes.centered)}>
                            properties
                        </Grid>
                    </Grid>
                    <Grid item container direction="column" wrap="nowrap" className={classes.gridItemList}>
                        {
                            joinedMoleculeLists.map(data => (
                                <Grid item key={data.id}>
                                    <MoleculeView height={imgHeight} width={imgWidth} data={data} />
                                </Grid>
                            ))
                        }
                    </Grid>
                </Grid>
            </BorderedView>
            </div>
        )
    }
}
function mapStateToProps(state) {
  return {
      group_type: state.apiReducers.present.group_type,
      target_on: state.apiReducers.present.target_on,
      mol_group_on: state.apiReducers.present.mol_group_on,
      object_selection: state.apiReducers.present.mol_group_selection,
      object_list: state.apiReducers.present.molecule_list,
      cached_mol_lists: state.apiReducers.present.cached_mol_lists,
      mol_group_list: state.apiReducers.present.mol_group_list,
  }
}
const mapDispatchToProps = {
    setObjectList: apiActions.setMoleculeList,
    setCachedMolLists: apiActions.setCachedMolLists,
    deleteObject: nglLoadActions.deleteObject,
    loadObject: nglLoadActions.loadObject
}
export default connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(MoleculeList));
