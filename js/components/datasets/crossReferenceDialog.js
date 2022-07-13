import React, { forwardRef, memo, useContext, useEffect } from 'react';
import { CircularProgress, Grid, Popper, IconButton, Typography, Tooltip } from '@material-ui/core';
import { Close } from '@material-ui/icons';
import { makeStyles } from '@material-ui/styles';
import { useDispatch, useSelector } from 'react-redux';
import {
  loadScoresOfCrossReferenceCompounds,
  resetCrossReferenceDialog,
  removeDatasetLigand,
  removeDatasetHitProtein,
  removeDatasetComplex,
  addDatasetLigand,
  addDatasetHitProtein,
  addDatasetComplex,
  withDisabledDatasetMoleculesNglControlButtons
} from './redux/dispatchActions';
import { Button } from '../common/Inputs/Button';
import classNames from 'classnames';
import DatasetMoleculeView from './datasetMoleculeView';
import { colourList } from '../preview/molecule/utils/color';
import { NglContext } from '../nglView/nglProvider';
import { VIEWS } from '../../constants/constants';
import { Panel } from '../common/Surfaces/Panel';
import {
  getCrossReferenceCompoundListByCompoundName,
  getListOfSelectedComplexOfAllDatasets,
  getListOfSelectedLigandOfAllDatasets,
  getListOfSelectedProteinOfAllDatasets
} from './redux/selectors';
import { changeButtonClassname } from './helpers';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { setDeselectedAllByType, setSelectedAllByType } from './redux/actions';
import useDisableDatasetNglControlButtons from './useDisableDatasetNglControlButtons';
import GroupDatasetNglControlButtonsContext from './groupDatasetNglControlButtonsContext';

const addType = {
  ligand: addDatasetLigand,
  protein: addDatasetHitProtein,
  complex: addDatasetComplex
};

const removeType = {
  ligand: removeDatasetLigand,
  protein: removeDatasetHitProtein,
  complex: removeDatasetComplex
};

const useStyles = makeStyles(theme => ({
  paper: {
    width: 472,
    height: 294,
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
    height: 214,
    width: 'fit-content'
  },
  search: {
    margin: theme.spacing(1),
    width: 140,
    '& .MuiInputBase-root': {
      color: theme.palette.white
    },
    '& .MuiInput-underline:before': {
      borderBottomColor: theme.palette.white
    },
    '& .MuiInput-underline:after': {
      borderBottomColor: theme.palette.white
    }
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
      backgroundColor: theme.palette.primary.main,
      color: theme.palette.primary.contrastText
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
      backgroundColor: theme.palette.primary.light,
      color: theme.palette.black
    }
  },
  contColButtonHalfSelected: {
    backgroundColor: theme.palette.primary.semidark,
    color: theme.palette.primary.contrastText,
    '&:hover': {
      backgroundColor: theme.palette.primary.light,
      color: theme.palette.black
    }
  }
}));

export const CrossReferenceDialog = memo(
  forwardRef(({ open = false, anchorEl }, ref) => {
    const dispatch = useDispatch();
    const id = open ? 'simple-popover-compound-cross-reference' : undefined;
    const imgHeight = 49;
    const imgWidth = 150;
    const classes = useStyles();

    const { getNglView } = useContext(NglContext);
    const stage = getNglView(VIEWS.MAJOR_VIEW) && getNglView(VIEWS.MAJOR_VIEW).stage;

    const moleculeList = useSelector(state => getCrossReferenceCompoundListByCompoundName(state));
    const isLoadingCrossReferenceScores = useSelector(state => state.datasetsReducers.isLoadingCrossReferenceScores);

    const ligandList = useSelector(state => getListOfSelectedLigandOfAllDatasets(state));
    const proteinList = useSelector(state => getListOfSelectedProteinOfAllDatasets(state));
    const complexList = useSelector(state => getListOfSelectedComplexOfAllDatasets(state));

    const compoundsToBuyDatasetMap = useSelector(state => state.datasetsReducers.compoundsToBuyDatasetMap);

    const compoundsToBuyList = Object.values(compoundsToBuyDatasetMap).flat();

    const selectedMolecules = moleculeList.filter(({ molecule }) => compoundsToBuyList?.includes(molecule.id));

    useEffect(() => {
      if (moleculeList && Array.isArray(moleculeList) && moleculeList.length > 0) {
        // moleculeList has following structure:
        // [
        // {molecule: {any data...}, datasetID: 1},
        // ...]
        dispatch(loadScoresOfCrossReferenceCompounds([...new Set(moleculeList.map(item => item.datasetID))]));
      }
    }, [dispatch, moleculeList]);

    const isLigandOn = changeButtonClassname(
      ligandList.filter(
        moleculeID => selectedMolecules.find(molecule => molecule.molecule.id === moleculeID) !== undefined
      ),
      selectedMolecules
    );
    const isProteinOn = changeButtonClassname(
      proteinList.filter(
        moleculeID => selectedMolecules.find(molecule => molecule.molecule.id === moleculeID) !== undefined
      ),
      selectedMolecules
    );
    const isComplexOn = changeButtonClassname(
      complexList.filter(
        moleculeID => selectedMolecules.find(molecule => molecule.molecule.id === moleculeID) !== undefined
      ),
      selectedMolecules
    );

    if (anchorEl === null) {
      dispatch(resetCrossReferenceDialog());
    }

    const removeSelectedType = (type, molecules) => {
      dispatch(setDeselectedAllByType(type, null, molecules, true));
      molecules.forEach(molecule => {
        dispatch(
          removeType[type](
            stage,
            molecule.molecule,
            colourList[molecule.molecule.id % colourList.length],
            molecule.datasetID,
            true
          )
        );
      });
    };

    const addSelectedType = (type, molecules) => {
      dispatch(
        withDisabledDatasetMoleculesNglControlButtons(
          [...new Set(molecules.map(({ datasetID }) => datasetID))], // distinct datasetIDs
          molecules.map(({ molecule }) => molecule.id),
          type,
          async () => {
            dispatch(setSelectedAllByType(type, null, molecules, true));

            const promises = [];

            molecules.forEach(molecule => {
              promises.push(
                dispatch(
                  addType[type](
                    stage,
                    molecule.molecule,
                    colourList[molecule.molecule.id % colourList.length],
                    molecule.datasetID,
                    true
                  )
                )
              );
            });

            await Promise.all(promises);
          }
        )
      );
    };

    const getMoleculesToSelect = list => {
      return selectedMolecules.filter(({ molecule }) => !list.includes(molecule.id));
    };

    const getMoleculesToDeselect = list => {
      return selectedMolecules.filter(({ molecule }) => list.includes(molecule.id));
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

    const removeOrAddType = (type, areSelected) => {
      const molecules = getSelectedMoleculesByType(type, !areSelected);

      if (areSelected) {
        removeSelectedType(type, molecules);
      } else {
        addSelectedType(type, molecules);
      }
    };

    const groupDatasetsNglControlButtonsDisabledState = useDisableDatasetNglControlButtons(selectedMolecules);

    return (
      <>
        {anchorEl && anchorEl !== null && (
          <>
            <Popper id={id} open={open} anchorEl={anchorEl} placement="left-start" ref={ref}>
              <Panel
                hasHeader
                secondaryBackground
                title="Cross Reference"
                className={classes.paper}
                headerActions={[
                  <Tooltip title="Close cross reference dialog">
                    <IconButton
                      color="inherit"
                      className={classes.headerButton}
                      onClick={() => dispatch(resetCrossReferenceDialog())}
                    >
                      <Close />
                    </IconButton>
                  </Tooltip>
                ]}
              >
                {isLoadingCrossReferenceScores === false && moleculeList && (
                  <>
                    <Grid container justify="flex-start" direction="row" className={classes.molHeader} wrap="nowrap">
                      <Grid item container justify="flex-start" direction="row">
                        {selectedMolecules.length > 0 && (
                          <Grid item>
                            <Grid
                              container
                              direction="row"
                              justify="flex-start"
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
                                    onClick={() => removeOrAddType('ligand', isLigandOn)}
                                    disabled={groupDatasetsNglControlButtonsDisabledState.ligand}
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
                                    onClick={() => removeOrAddType('protein', isProteinOn)}
                                    disabled={groupDatasetsNglControlButtonsDisabledState.protein}
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
                                    onClick={() => removeOrAddType('complex', isComplexOn)}
                                    disabled={groupDatasetsNglControlButtonsDisabledState.complex}
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
                      <GroupDatasetNglControlButtonsContext.Provider
                        value={groupDatasetsNglControlButtonsDisabledState}
                      >
                        <DndProvider backend={HTML5Backend}>
                          {moleculeList.length > 0 &&
                            moleculeList.map((data, index, array) => {
                              let molecule = Object.assign({ isCrossReference: true }, data.molecule);
                              let previousData =
                                index > 0 && Object.assign({ isCrossReference: true }, array[index - 1]);
                              let nextData =
                                index < array?.length && Object.assign({ isCrossReference: true }, array[index + 1]);
                              const isCheckedToBuy = selectedMolecules.some(
                                ({ datasetID, molecule }) =>
                                  molecule.id === data.molecule.id && datasetID === data.datasetID
                              );

                              return (
                                <DatasetMoleculeView
                                  key={index}
                                  index={index}
                                  imageHeight={imgHeight}
                                  imageWidth={imgWidth}
                                  data={molecule}
                                  datasetID={data.datasetID}
                                  hideFButton
                                  showDatasetName
                                  previousItemData={previousData}
                                  nextItemData={nextData}
                                  L={ligandList.includes(data.id)}
                                  P={proteinList.includes(data.id)}
                                  C={complexList.includes(data.id)}
                                  S={false}
                                  V={false}
                                  isCheckedToBuy={isCheckedToBuy}
                                  disableL={isCheckedToBuy && groupDatasetsNglControlButtonsDisabledState.ligand}
                                  disableP={isCheckedToBuy && groupDatasetsNglControlButtonsDisabledState.protein}
                                  disableC={isCheckedToBuy && groupDatasetsNglControlButtonsDisabledState.complex}
                                  arrowsHidden
                                />
                              );
                            })}
                        </DndProvider>
                      </GroupDatasetNglControlButtonsContext.Provider>
                      {!(moleculeList.length > 0) && (
                        <Grid
                          container
                          justify="center"
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
                  </>
                )}
                {isLoadingCrossReferenceScores === true && (
                  <Grid container alignItems="center" justify="center">
                    <Grid item>
                      <CircularProgress />
                    </Grid>
                  </Grid>
                )}
              </Panel>
            </Popper>
          </>
        )}
      </>
    );
  })
);
