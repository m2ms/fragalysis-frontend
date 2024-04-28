import React, { forwardRef, memo, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { CircularProgress, Grid, Popper, IconButton, Typography, Tooltip } from '@material-ui/core';
import { Close } from '@material-ui/icons';
import { makeStyles } from '@material-ui/styles';
import { useDispatch, useSelector } from 'react-redux';
import classNames from 'classnames';
import { NglContext } from '../../nglView/nglProvider';
import { VIEWS } from '../../../constants/constants';
import { changeButtonClassname } from '../../datasets/helpers';
import {
  addComplex,
  addHitProtein,
  addLigand,
  addSurface,
  removeComplex,
  removeHitProtein,
  removeLigand,
  removeSelectedMolTypes,
  removeSurface,
  withDisabledMoleculesNglControlButtons
} from './redux/dispatchActions';
import { colourList } from './utils/color';
import {
  setDeselectedAllByType,
  setOpenObservationsDialog,
  setSelectedAllByType,
  setTagEditorOpenObs
} from '../../../reducers/selection/actions';
import useDisableNglControlButtons from './useDisableNglControlButtons';
import { Button, Panel } from '../../common';
import SearchField from '../../common/Components/SearchField';
import GroupNglControlButtonsContext from './groupNglControlButtonsContext';
import MoleculeView from './moleculeView';
import { TagEditor } from '../tags/modal/tagEditor';
import { ToastContext } from '../../toast';
import { DJANGO_CONTEXT } from '../../../utils/djangoContext';

const useStyles = makeStyles(theme => ({
  paper: {
    width: 472,
    // minHeight: 294,
    overflowY: 'hidden'
  },
  molHeader: {
    marginLeft: 19,
    width: 'calc(100% - 19px)'
  },
  rightBorder: {
    borderRight: '1px solid',
    borderRightColor: theme.palette.background.divider,
    fontWeight: 'bold',
    paddingLeft: theme.spacing(1) / 2,
    paddingRight: theme.spacing(1) / 2,
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(1),
    fontSize: 8,
    width: 25,
    textAlign: 'center',
    '&:last-child': {
      borderRight: 'none',
      width: 32
    }
  },
  headerButton: {
    paddingTop: 10
  },
  content: {
    overflowY: 'auto',
    height: 214
  },
  search: {
    width: 140
  },
  notFound: {
    paddingTop: theme.spacing(2)
  },
  contButtonsMargin: {
    marginTop: theme.spacing(1) / 2,
    marginBottom: theme.spacing(1) / 2,
    marginLeft: theme.spacing(2)
  },
  contColButton: {
    minWidth: 'fit-content',
    paddingLeft: theme.spacing(1) / 4,
    paddingRight: theme.spacing(1) / 4,
    paddingBottom: 0,
    paddingTop: 0,
    fontWeight: 'bold',
    fontSize: 9,
    borderRadius: 0,
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.primary.light,
    '&:hover': {
      backgroundColor: theme.palette.primary.light
      //color: theme.palette.primary.contrastText
    },
    '&:disabled': {
      borderRadius: 0,
      borderColor: 'white'
    }
  },
  contColButtonSelected: {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    '&:hover': {
      backgroundColor: theme.palette.primary.main
      //color: theme.palette.black
    }
  },
  contColButtonHalfSelected: {
    backgroundColor: theme.palette.primary.semidark,
    color: theme.palette.primary.contrastText,
    '&:hover': {
      backgroundColor: theme.palette.primary.semidark
      //color: theme.palette.black
    }
  },
  contColButtonBottomRow: {
    border: '1px solid'
  },
  bottomRow: {
    marginTop: theme.spacing(1) / 4
  },
  dropdownContent: {
    display: 'none',
    position: 'absolute',
    backgroundColor: theme.palette.primary.contrastText,
    maxWidth: 150,
    marginTop: -1,
    border: '1px solid',
    borderColor: theme.palette.primary.main,
    // color: theme.palette.primary.contrastText,
    // boxShadow: '0px 8px 16px 0px rgba(0, 0, 0, 0.2)',
    zIndex: 1
  },
  dropdownItem: {
    fontSize: 12,
    // fontWeight: 'bold',
    paddingLeft: theme.spacing(1) / 4,
    paddingRight: theme.spacing(1) / 4,
    '&:hover': {
      cursor: 'pointer',
      backgroundColor: theme.palette.primary.light
    }
  },
  dropdown: {
    '&:hover $dropdownContent': {
      display: 'flex'
    }
  }
}));

export const ObservationsDialog = memo(
  forwardRef(({ open = false, anchorEl }, ref) => {
    const dispatch = useDispatch();

    const id = open ? 'simple-popover-compound-inspirations' : undefined;
    const imgHeight = 49;
    const imgWidth = 150;
    const classes = useStyles();
    const [searchString, setSearchString] = useState(null);
    const selectedAll = useRef(false);

    const { getNglView } = useContext(NglContext);
    const { toastInfo } = useContext(ToastContext);
    const stage = getNglView(VIEWS.MAJOR_VIEW) && getNglView(VIEWS.MAJOR_VIEW).stage;

    const isLoadingInspirationListOfMolecules = useSelector(
      state => state.datasetsReducers.isLoadingInspirationListOfMolecules
    );
    const observationsDataList = useSelector(state => state.selectionReducers.observationsForLHSCmp);

    const ligandList = useSelector(state => state.selectionReducers.fragmentDisplayList);
    const proteinList = useSelector(state => state.selectionReducers.proteinList);
    const complexList = useSelector(state => state.selectionReducers.complexList);
    const surfaceList = useSelector(state => state.selectionReducers.surfaceList);
    const densityList = useSelector(state => state.selectionReducers.densityList);
    const densityListCustom = useSelector(state => state.selectionReducers.densityListCustom);
    const qualityList = useSelector(state => state.selectionReducers.qualityList);
    const vectorOnList = useSelector(state => state.selectionReducers.vectorOnList);
    const informationList = useSelector(state => state.selectionReducers.informationList);
    const molForTagEditId = useSelector(state => state.selectionReducers.molForTagEdit);
    const moleculesToEditIds = useSelector(state => state.selectionReducers.moleculesToEdit);

    const isTagEditorOpenObs = useSelector(state => state.selectionReducers.tagEditorOpenedObs);

    const tagEditorRef = useRef();

    const [tagEditorAnchorEl, setTagEditorAnchorEl] = useState(null);

    const moleculeList = useMemo(() => {
      if (searchString !== null) {
        return observationsDataList.filter(molecule =>
          molecule.code.toLowerCase().includes(searchString.toLowerCase())
        );
      }
      return observationsDataList;
    }, [observationsDataList, searchString]);

    const allSelectedMolecules = observationsDataList.filter(molecule => moleculesToEditIds.includes(molecule.id));

    // TODO: refactor from this line (duplicity in datasetMoleculeList.js)
    const isLigandOn = changeButtonClassname(
      ligandList.filter(moleculeID => allSelectedMolecules.find(molecule => molecule.id === moleculeID) !== undefined),
      allSelectedMolecules
    );
    const isProteinOn = changeButtonClassname(
      proteinList.filter(moleculeID => allSelectedMolecules.find(molecule => molecule.id === moleculeID) !== undefined),
      allSelectedMolecules
    );
    const isComplexOn = changeButtonClassname(
      complexList.filter(moleculeID => allSelectedMolecules.find(molecule => molecule.id === moleculeID) !== undefined),
      allSelectedMolecules
    );

    const addType = {
      ligand: addLigand,
      protein: addHitProtein,
      complex: addComplex,
      surface: addSurface
    };

    const removeType = {
      ligand: removeLigand,
      protein: removeHitProtein,
      complex: removeComplex,
      surface: removeSurface
    };

    const removeSelectedTypes = useCallback(
      (skipMolecules = [], skipTracking = false) => {
        const molecules = [...moleculeList].filter(molecule => !skipMolecules.some(mol => molecule.id === mol.id));
        dispatch(removeSelectedMolTypes(stage, molecules, skipTracking, true));
      },
      [dispatch, moleculeList, stage]
    );

    const removeSelectedType = (type, skipTracking = false) => {
      if (type === 'ligand') {
        allSelectedMolecules.forEach(molecule => {
          dispatch(removeType[type](stage, molecule, skipTracking));
        });
      } else {
        allSelectedMolecules.forEach(molecule => {
          dispatch(removeType[type](stage, molecule, colourList[molecule.id % colourList.length], skipTracking));
        });
      }

      selectedAll.current = false;
    };

    const addNewType = (type, skipTracking = false) => {
      dispatch(
        withDisabledMoleculesNglControlButtons(
          allSelectedMolecules.map(molecule => molecule.id),
          type,
          async () => {
            const promises = [];

            if (type === 'ligand') {
              allSelectedMolecules.forEach(molecule => {
                promises.push(
                  dispatch(
                    addType[type](
                      stage,
                      molecule,
                      colourList[molecule.id % colourList.length],
                      false,
                      true,
                      skipTracking
                    )
                  )
                );
              });
            } else {
              allSelectedMolecules.forEach(molecule => {
                promises.push(
                  dispatch(addType[type](stage, molecule, colourList[molecule.id % colourList.length], skipTracking))
                );
              });
            }

            await Promise.all(promises);
          }
        )
      );
    };

    const ucfirst = string => {
      return string.charAt(0).toUpperCase() + string.slice(1);
    };

    const onButtonToggle = (type, calledFromSelectAll = false) => {
      if (calledFromSelectAll === true && selectedAll.current === true) {
        // REDO
        if (eval('is' + ucfirst(type) + 'On') === false) {
          addNewType(type);
        }
      } else if (calledFromSelectAll && selectedAll.current === false) {
        removeSelectedType(type);
      } else if (!calledFromSelectAll) {
        if (eval('is' + ucfirst(type) + 'On') === false) {
          let molecules = getSelectedMoleculesByType(type, true);
          dispatch(setSelectedAllByType(type, molecules, true));
          addNewType(type, true);
        } else {
          let molecules = getSelectedMoleculesByType(type, false);
          dispatch(setDeselectedAllByType(type, molecules, true));
          removeSelectedType(type, true);
        }
      }
    };

    const getSelectedMoleculesByType = (type, isAdd) => {
      switch (type) {
        case 'ligand':
          return isAdd ? getMoleculesToSelect(ligandList) : getMoleculesToDeselect(ligandList);
        case 'protein':
          return isAdd ? getMoleculesToSelect(proteinList) : getMoleculesToDeselect(proteinList);
        case 'complex':
          return isAdd ? getMoleculesToSelect(complexList) : getMoleculesToDeselect(complexList);
        default:
          return null;
      }
    };

    const getMoleculesToSelect = list => {
      let molecules = allSelectedMolecules.filter(m => !list.includes(m.id));
      return molecules;
    };

    const getMoleculesToDeselect = list => {
      let molecules = allSelectedMolecules.filter(m => list.includes(m.id));
      return molecules;
    };

    const groupNglControlButtonsDisabledState = useDisableNglControlButtons(allSelectedMolecules);

    const anyControlButtonDisabled = Object.values(groupNglControlButtonsDisabledState).some(
      buttonState => buttonState
    );

    const handleSetAsGroupName = () => {
      toastInfo('calling handleSetAsGroupName!', { autoHideDuration: 5000 });
    };
    const handleSetMainObservation = () => {
      toastInfo('calling handleSetMainObservation!', { autoHideDuration: 5000 });
    };
    const handleManageGrouping = (poseId) => {
      if (poseId === 0) {
        toastInfo(`calling handleManageGrouping and creating new pose from selection`, { autoHideDuration: 5000 });
      } else {
        toastInfo(`calling handleManageGrouping for pose with id ${poseId}`, { autoHideDuration: 5000 });
      }
    };

    //  TODO refactor to this line

    return (
      <Popper id={id} open={open} anchorEl={anchorEl} placement="left-start" ref={ref}>
        <Panel
          hasHeader
          secondaryBackground
          title="Observations"
          className={classes.paper}
          headerActions={[
            <SearchField
              className={classes.search}
              id="search-inspiration-dialog"
              placeholder="Search"
              size="small"
              onChange={setSearchString}
              disabled={!(isLoadingInspirationListOfMolecules === false && moleculeList)}
            />,
            <Tooltip title="Close observations">
              <IconButton
                color="inherit"
                className={classes.headerButton}
                onClick={() => dispatch(setOpenObservationsDialog(false))}
              >
                <Close />
              </IconButton>
            </Tooltip>
          ]}
        >
          {isTagEditorOpenObs && (
            <TagEditor
              open={isTagEditorOpenObs}
              closeDisabled={anyControlButtonDisabled}
              setOpenDialog={setTagEditorOpenObs}
              anchorEl={tagEditorAnchorEl}
              ref={tagEditorRef}
            />
          )}
          {isLoadingInspirationListOfMolecules === false && moleculeList && (
            <>
              <Grid container justifyContent="flex-start" direction="row" className={classes.molHeader} wrap="nowrap">
                <Grid item container justifyContent="flex-start" direction="row">
                  {/* {Object.keys(moleculeProperty).map(key => (
                    <Grid item key={key} className={classes.rightBorder}>
                      {moleculeProperty[key]}
                    </Grid>
                  ))} */}
                  {allSelectedMolecules.length > 0 && (
                    <Grid item>
                      <Grid
                        container
                        direction="row"
                        justifyContent="flex-start"
                        alignItems="center"
                        wrap="nowrap"
                        className={classes.contButtonsMargin}
                      >
                        <Tooltip title="all ligands">
                          <Grid item>
                            <Button
                              variant="outlined"
                              className={classNames(classes.contColButton, {
                                [classes.contColButtonSelected]: isLigandOn,
                                [classes.contColButtonHalfSelected]: isLigandOn === null
                              })}
                              onClick={() => onButtonToggle('ligand')}
                              disabled={groupNglControlButtonsDisabledState.ligand}
                            >
                              L
                            </Button>
                          </Grid>
                        </Tooltip>
                        <Tooltip title="all sidechains">
                          <Grid item>
                            <Button
                              variant="outlined"
                              className={classNames(classes.contColButton, {
                                [classes.contColButtonSelected]: isProteinOn,
                                [classes.contColButtonHalfSelected]: isProteinOn === null
                              })}
                              onClick={() => onButtonToggle('protein')}
                              disabled={groupNglControlButtonsDisabledState.protein}
                            >
                              P
                            </Button>
                          </Grid>
                        </Tooltip>
                        <Tooltip title="all interactions">
                          <Grid item>
                            {/* C stands for contacts now */}
                            <Button
                              variant="outlined"
                              className={classNames(classes.contColButton, {
                                [classes.contColButtonSelected]: isComplexOn,
                                [classes.contColButtonHalfSelected]: isComplexOn === null
                              })}
                              onClick={() => onButtonToggle('complex')}
                              disabled={groupNglControlButtonsDisabledState.complex}
                            >
                              C
                            </Button>
                          </Grid>
                        </Tooltip>
                      </Grid>
                    </Grid>
                  )}
                </Grid>
              </Grid>
              <div className={classes.content}>
                {moleculeList.length > 0 &&
                  moleculeList.map((molecule, index, array) => {
                    let data = molecule;
                    let previousData = index > 0 && { ...array[index - 1] };
                    let nextData = index < array?.length && { ...array[index + 1] };
                    const selected = allSelectedMolecules.some(molecule => molecule.id === data.id);

                    return (
                      <GroupNglControlButtonsContext.Provider value={groupNglControlButtonsDisabledState}>
                        <MoleculeView
                          key={index}
                          index={index}
                          imageHeight={imgHeight}
                          imageWidth={imgWidth}
                          data={data}
                          searchMoleculeGroup
                          previousItemData={previousData}
                          nextItemData={nextData}
                          removeSelectedTypes={removeSelectedTypes}
                          L={ligandList.includes(molecule.id)}
                          P={proteinList.includes(molecule.id)}
                          C={complexList.includes(molecule.id)}
                          S={surfaceList.includes(molecule.id)}
                          D={densityList.includes(molecule.id)}
                          D_C={densityListCustom.includes(data.id)}
                          Q={qualityList.includes(molecule.id)}
                          V={vectorOnList.includes(molecule.id)}
                          I={informationList.includes(data.id)}
                          selected={selected}
                          isTagEditorInvokedByMolecule={molForTagEditId.some(mid => mid === data.id)}
                          disableL={selected && groupNglControlButtonsDisabledState.ligand}
                          disableP={selected && groupNglControlButtonsDisabledState.protein}
                          disableC={selected && groupNglControlButtonsDisabledState.complex}
                          setRef={setTagEditorAnchorEl}
                        />
                      </GroupNglControlButtonsContext.Provider>
                    );
                  })}
                {!(moleculeList.length > 0) && (
                  <Grid
                    container
                    justifyContent="center"
                    alignItems="center"
                    direction="row"
                    className={classes.notFound}
                  >
                    <Grid item>
                      <Typography variant="body2">No molecules found!</Typography>
                    </Grid>
                  </Grid>
                )}
              </div>
              {DJANGO_CONTEXT.pk && <Grid container direction="row" justifyContent="space-evenly" alignItems="center" className={classes.bottomRow}>
                <Grid item>
                  <Button
                    onClick={handleSetAsGroupName}
                    disabled={allSelectedMolecules.length !== 1}
                    color="inherit"
                    variant="text"
                    size="small"
                    data-id="setAsGroupName"
                    className={classNames(classes.contColButton, classes.contColButtonBottomRow)}
                  >
                    Set as group name
                  </Button>
                </Grid>
                <Grid item>
                  <Button
                    onClick={handleSetMainObservation}
                    disabled={allSelectedMolecules.length !== 1}
                    color="inherit"
                    variant="text"
                    size="small"
                    data-id="setMainObservation"
                    className={classNames(classes.contColButton, classes.contColButtonBottomRow)}
                  >
                    Set main observation
                  </Button>
                </Grid>
                <Grid item className={classes.dropdown}>
                  <Button
                    disabled={allSelectedMolecules.length < 1}
                    color="inherit"
                    variant="text"
                    size="small"
                    data-id="manageGrouping"
                    className={classNames(classes.contColButton, classes.contColButtonBottomRow)}
                  >
                    Manage grouping
                  </Button>
                  <Grid container direction="column" className={classes.dropdownContent} >
                    <Grid item className={classes.dropdownItem} onClick={() => handleManageGrouping(0)}>new group from selection</Grid>
                    {/* TODO just a placeholder for poses here */}
                    {[{ id: 1, label: '1x' }, { id: 2, label: '2x' }, { id: 3, label: '3x' }].map(pose =>
                      <Grid item className={classes.dropdownItem} onClick={() => handleManageGrouping(pose.id)}>add selection to {pose.label}</Grid>
                    )}
                  </Grid>
                </Grid>
              </Grid>}
            </>
          )}
          {isLoadingInspirationListOfMolecules === true && (
            <Grid container alignItems="center" justifyContent="center">
              <Grid item>
                <CircularProgress />
              </Grid>
            </Grid>
          )}
        </Panel>
      </Popper>
    );
  })
);
