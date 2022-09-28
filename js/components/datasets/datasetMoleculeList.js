/**
 * Created by abradley on 14/03/2018.
 */
import {
  Grid,
  Chip,
  Tooltip,
  makeStyles,
  CircularProgress,
  Divider,
  Typography,
  IconButton,
  ButtonGroup
} from '@material-ui/core';
import React, { useState, useEffect, memo, useRef, useContext, useCallback, useMemo } from 'react';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import DatasetMoleculeView from './datasetMoleculeView';
import { colourList } from '../preview/molecule/utils/color';
import InfiniteScroll from 'react-infinite-scroller';
import { Button } from '../common/Inputs/Button';
import { Panel } from '../common/Surfaces/Panel';
import { ComputeSize } from '../../utils/computeSize';
import { VIEWS } from '../../constants/constants';
import { NglContext } from '../nglView/nglProvider';
import classNames from 'classnames';
import {
  addDatasetLigand,
  removeDatasetLigand,
  addDatasetHitProtein,
  removeDatasetHitProtein,
  addDatasetComplex,
  removeDatasetComplex,
  addDatasetSurface,
  removeDatasetSurface,
  autoHideDatasetDialogsOnScroll,
  withDisabledDatasetMoleculesNglControlButtons,
  moveDatasetMolecule
} from './redux/dispatchActions';
import { setDragDropState, setFilterDialogOpen, setSearchStringOfCompoundSet } from './redux/actions';
import { DatasetFilter } from './datasetFilter';
import { FilterList, Link } from '@material-ui/icons';
import { getJoinedMoleculeLists } from './redux/selectors';
import { InspirationDialog } from './inspirationDialog';
import { CrossReferenceDialog } from './crossReferenceDialog';
import { AlertModal } from '../common/Modal/AlertModal';
import { setSelectedAllByType, setDeselectedAllByType } from './redux/actions';

import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import SearchField from '../common/Components/SearchField';
import useDisableDatasetNglControlButtons from './useDisableDatasetNglControlButtons';
import GroupDatasetNglControlButtonsContext from './groupDatasetNglControlButtonsContext';
import { useScrollToSelected } from './useScrollToSelected';
import { useEffectDebugger } from '../../utils/effects';

const useStyles = makeStyles(theme => ({
  container: {
    height: '100%',
    width: 'inherit',
    color: theme.palette.black
  },
  gridItemHeader: {
    height: '32px',
    fontSize: '8px',
    color: '#7B7B7B'
  },
  gridItemHeaderVert: {
    transform: 'rotate(-90deg)',
    height: 'fit-content'
  },
  gridItemHeaderHoriz: {
    width: 'fit-content'
  },
  gridItemList: {
    overflow: 'auto',
    height: `calc(100% - ${theme.spacing(6)}px - ${theme.spacing(2)}px)`
  },
  centered: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
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
      color: '#003f00'
    }
  },
  paddingProgress: {
    padding: theme.spacing(1)
  },
  filterSection: {
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1)
  },
  filterTitle: {
    transform: 'rotate(-90deg)'
  },
  molHeader: {
    width: 'inherit'
  },
  rank: {
    width: theme.spacing(3),
    marginLeft: -theme.spacing(1) / 4,
    fontStyle: 'italic',
    fontSize: 8,
    overflow: 'hidden',
    textAlign: 'center',
    borderRight: '1px solid',
    borderRightColor: theme.palette.background.divider
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
    width: 32,
    textAlign: 'center',
    '&:last-child': {
      borderRight: 'none',
      width: 32
    },
    overflow: 'hidden',
    whiteSpace: 'nowrap'
  },
  contButtonsMargin: {
    margin: theme.spacing(1) / 2
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
      // color: theme.palette.primary.contrastText
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
      // color: theme.palette.black
    }
  },
  contColButtonHalfSelected: {
    backgroundColor: theme.palette.primary.semidark,
    color: theme.palette.primary.contrastText,
    '&:hover': {
      backgroundColor: theme.palette.primary.semidark
      // color: theme.palette.black
    }
  },
  propertyChip: {
    fontWeight: 'bolder'
  },
  search: {
    width: 140
  },
  loading: {
    paddingTop: theme.spacing(2)
  },
  total: {
    ...theme.typography.button,
    color: theme.palette.primary.main,
    fontStyle: 'italic'
  }
}));

const DatasetMoleculeList = ({ title, datasetID, url }) => {
  const classes = useStyles();
  const dispatch = useDispatch();

  const [nextXMolecules, setNextXMolecules] = useState(0);
  const moleculesPerPage = 5;
  const [currentPage, setCurrentPage] = useState(0);

  const imgHeight = 49;
  const imgWidth = 150;
  const sortDialogOpen = useSelector(state => state.datasetsReducers.filterDialogOpen);
  const isOpenInspirationDialog = useSelector(state => state.datasetsReducers.isOpenInspirationDialog);
  const isOpenCrossReferenceDialog = useSelector(state => state.datasetsReducers.isOpenCrossReferenceDialog);

  const moleculeLists = useSelector(state => state.datasetsReducers.moleculeLists);
  const isLoadingMoleculeList = useSelector(state => state.datasetsReducers.isLoadingMoleculeList);
  const filteredScoreProperties = useSelector(state => state.datasetsReducers.filteredScoreProperties);
  const filterMap = useSelector(state => state.datasetsReducers.filterDatasetMap);
  const filterSettings = filterMap && datasetID && filterMap[datasetID];
  const filterPropertiesMap = useSelector(state => state.datasetsReducers.filterPropertiesDatasetMap);
  const filterProperties = filterPropertiesMap && datasetID && filterPropertiesMap[datasetID];
  const [sortDialogAnchorEl, setSortDialogAnchorEl] = useState(null);

  const isActiveFilter = !!(filterSettings || {}).active;
  const { getNglView } = useContext(NglContext);

  const stage = getNglView(VIEWS.MAJOR_VIEW) && getNglView(VIEWS.MAJOR_VIEW).stage;
  const [selectedMoleculeRef, setSelectedMoleculeRef] = useState(null);

  const filterRef = useRef();

  const joinedMoleculeLists = useSelector(state => getJoinedMoleculeLists(datasetID, state), shallowEqual);

  // console.log('DatasetMoleculeList - update');

  // const disableUserInteraction = useDisableUserInteraction();

  // TODO: Reset Infinity scroll

  const loadNextMolecules = useCallback(async () => {
    await setNextXMolecules(0);
    setCurrentPage(prevPage => prevPage + 1);
  }, []);
  const listItemOffset = (currentPage + 1) * moleculesPerPage + nextXMolecules;

  const currentMolecules = joinedMoleculeLists.slice(0, listItemOffset);
  // setCurrentMolecules(currentMolecules);
  const canLoadMore = listItemOffset < joinedMoleculeLists.length;

  const selectedAll = useRef(false);

  const compoundsToBuyList = useSelector(state => state.datasetsReducers.compoundsToBuyDatasetMap[datasetID]);

  const addMoleculeViewRef = useScrollToSelected(datasetID, moleculesPerPage, setCurrentPage);

  const ligandList = useSelector(state => state.datasetsReducers.ligandLists[datasetID]);
  const proteinList = useSelector(state => state.datasetsReducers.proteinLists[datasetID]);
  const complexList = useSelector(state => state.datasetsReducers.complexLists[datasetID]);
  const surfaceList = useSelector(state => state.datasetsReducers.surfaceLists[datasetID]);

  const selectedMolecules = (moleculeLists[datasetID] || []).filter(mol => compoundsToBuyList?.includes(mol.id));

  const isTypeOn = typeList => {
    if (typeList && compoundsToBuyList) {
      return typeList.some(molId => selectedMolecules.some(mol => mol.id === molId));
    }
    return false;
  };

  const isLigandOn = isTypeOn(ligandList);
  const isProteinOn = isTypeOn(proteinList);
  const isComplexOn = isTypeOn(complexList);

  const addType = {
    ligand: addDatasetLigand,
    protein: addDatasetHitProtein,
    complex: addDatasetComplex,
    surface: addDatasetSurface
  };

  const removeType = {
    ligand: removeDatasetLigand,
    protein: removeDatasetHitProtein,
    complex: removeDatasetComplex,
    surface: removeDatasetSurface
  };

  // TODO: "currentMolecules" do not need to correspondent to selections in {type}List
  // TODO: so this could lead to inconsistend behaviour while scrolling
  // TODO: maybe change "currentMolecules.forEach" to "{type}List.forEach"

  const removeSelectedType = (type, skipTracking) => {
    selectedMolecules.forEach(molecule => {
      dispatch(removeType[type](stage, molecule, colourList[molecule.id % colourList.length], datasetID, skipTracking));
    });
    selectedAll.current = false;
  };

  const addNewType = (type, skipTracking) => {
    dispatch(
      withDisabledDatasetMoleculesNglControlButtons(
        [datasetID],
        selectedMolecules.map(molecule => molecule.id),
        type,
        async () => {
          const promises = [];

          selectedMolecules.forEach(molecule => {
            promises.push(
              dispatch(
                addType[type](stage, molecule, colourList[molecule.id % colourList.length], datasetID, skipTracking)
              )
            );
          });

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
        dispatch(setSelectedAllByType(type, datasetID, molecules));
        addNewType(type, true);
      } else {
        let molecules = getSelectedMoleculesByType(type, false);
        dispatch(setDeselectedAllByType(type, datasetID, molecules));
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
    let molecules = selectedMolecules.filter(m => !list.includes(m.id));
    let data = molecules.map(m => {
      return { datasetID, molecule: m };
    });
    return data;
  };

  const getMoleculesToDeselect = list => {
    let molecules = selectedMolecules.filter(m => list.includes(m.id));
    let data = molecules.map(m => {
      return { datasetID, molecule: m };
    });
    return data;
  };

  const actions = useMemo(
    () => [
      <SearchField
        className={classes.search}
        id="input-with-icon-textfield"
        placeholder="Search"
        onChange={value => {
          dispatch(setSearchStringOfCompoundSet(value));
          dispatch(setDragDropState(datasetID, null));
        }}
        disabled={isLoadingMoleculeList}
      />,
      <IconButton className={classes.panelButton} color={'inherit'} onClick={() => window.open(url, '_blank')}>
        <Tooltip title="Link to dataset">
          <Link />
        </Tooltip>
      </IconButton>,
      <IconButton
        className={classes.panelButton}
        onClick={event => {
          if (sortDialogOpen === false) {
            setSortDialogAnchorEl(filterRef.current);
            dispatch(setFilterDialogOpen(true));
          } else {
            setSortDialogAnchorEl(null);
            dispatch(setFilterDialogOpen(false));
          }
        }}
        color={'inherit'}
        disabled={isLoadingMoleculeList}
      >
        <Tooltip title="Filter/Sort">
          <FilterList />
        </Tooltip>
      </IconButton>
    ],
    [classes, datasetID, dispatch, filterRef, isLoadingMoleculeList, sortDialogOpen, url]
  );

  // useEffectDebugger(
  //   () => {},
  //   [classes, datasetID, dispatch, filterRef, isLoadingMoleculeList, sortDialogOpen, url],
  //   ['classes', 'datasetID', 'dispatch', 'filterRef', 'isLoadingMoleculeList', 'sortDialogOpen', 'url'],
  //   'DatasetMoleculeList - headerActions'
  // );

  /*useEffect(() => {
      // setCurrentPage(0);
    }, [object_selection]);*/

  const crossReferenceDialogRef = useRef();
  const inspirationDialogRef = useRef();
  const scrollBarRef = useRef();

  const [isOpenAlert, setIsOpenAlert] = useState(false);

  const moveMolecule = useCallback(
    (dragIndex, hoverIndex) => {
      dispatch(moveDatasetMolecule(datasetID, dragIndex, hoverIndex));
    },
    [dispatch, datasetID]
  );

  const groupDatasetsNglControlButtonsDisabledState = useDisableDatasetNglControlButtons(
    selectedMolecules.map(molecule => ({ datasetID, molecule }))
  );

  // useEffectDebugger(
  //   () => {},
  //   [setSortDialogAnchorEl, loadNextMolecules, addMoleculeViewRef, setSelectedMoleculeRef, moveMolecule],
  //   ['setSortDialogAnchorEl', 'loadNextMolecules', 'addMoleculeViewRef', 'setSelectedMoleculeRef', 'moveMolecule'],
  //   'DatasetMoleculeList - functions'
  // );

  // useEffectDebugger(
  //   () => {},
  //   [
  //     title,
  //     datasetID,
  //     url,
  //     sortDialogOpen,
  //     isOpenInspirationDialog,
  //     isOpenCrossReferenceDialog,
  //     moleculeLists,
  //     isLoadingMoleculeList,
  //     filteredScoreProperties,
  //     filterMap,
  //     filterSettings,
  //     filterPropertiesMap,
  //     filterProperties,
  //     sortDialogAnchorEl,
  //     isActiveFilter,
  //     selectedMoleculeRef,
  //     joinedMoleculeLists,
  //     nextXMolecules,
  //     currentPage,
  //     compoundsToBuyList,
  //     ligandList,
  //     proteinList,
  //     complexList,
  //     surfaceList,
  //     isOpenAlert
  //   ],
  //   [
  //     'title',
  //     'datasetID',
  //     'url',
  //     'sortDialogOpen',
  //     'isOpenInspirationDialog',
  //     'isOpenCrossReferenceDialog',
  //     'moleculeLists',
  //     'isLoadingMoleculeList',
  //     'filteredScoreProperties',
  //     'filterMap',
  //     'filterSettings',
  //     'filterPropertiesMap',
  //     'filterProperties',
  //     'sortDialogAnchorEl',
  //     'isActiveFilter',
  //     'selectedMoleculeRef',
  //     'joinedMoleculeLists',
  //     'nextXMolecules',
  //     'currentPage',
  //     'compoundsToBuyList',
  //     'ligandList',
  //     'proteinList',
  //     'complexList',
  //     'surfaceList',
  //     'isOpenAlert'
  //   ],
  //   'DatasetMoleculeList'
  // );

  return (
    <Panel hasHeader title={title} withTooltip headerActions={actions}>
      <AlertModal
        title="Are you sure?"
        description={`Loading of ${joinedMoleculeLists?.length} may take a long time`}
        open={isOpenAlert}
        handleOnOk={() => {
          setNextXMolecules(joinedMoleculeLists?.length || 0);
          setIsOpenAlert(false);
        }}
        handleOnCancel={() => {
          setIsOpenAlert(false);
        }}
      />
      {sortDialogOpen && (
        <DatasetFilter
          open={sortDialogOpen}
          anchorEl={sortDialogAnchorEl}
          datasetID={datasetID}
          filterProperties={filterProperties}
          active={filterSettings && filterSettings.active}
          predefined={filterSettings && filterSettings.predefined}
          priorityOrder={filterSettings && filterSettings.priorityOrder}
          setSortDialogAnchorEl={setSortDialogAnchorEl}
        />
      )}
      {isOpenInspirationDialog && (
        <InspirationDialog open anchorEl={selectedMoleculeRef} datasetID={datasetID} ref={inspirationDialogRef} />
      )}
      {isOpenCrossReferenceDialog && (
        <CrossReferenceDialog open anchorEl={selectedMoleculeRef} ref={crossReferenceDialogRef} />
      )}
      <div ref={filterRef}>
        {isActiveFilter && (
          <>
            <div className={classes.filterSection}>
              <Grid container spacing={1}>
                <Grid item xs={1} container alignItems="center">
                  <Typography variant="subtitle2" className={classes.filterTitle}>
                    Filters
                  </Typography>
                </Grid>
                <Grid item xs={11}>
                  <Grid container direction="row" justify="flex-start" spacing={1}>
                    {filterSettings.priorityOrder.map(attr => (
                      <Grid item key={`Mol-Tooltip-${attr}`}>
                        <Tooltip
                          title={`${filterProperties[attr].minValue}-${filterProperties[attr].maxValue} ${
                            filterProperties[attr].order === 1 ? '\u2191' : '\u2193'
                          }`}
                          placement="top"
                        >
                          <Chip size="small" label={attr} className={classes.propertyChip} />
                        </Tooltip>
                      </Grid>
                    ))}
                  </Grid>
                </Grid>
              </Grid>
            </div>
            <Divider />
          </>
        )}
      </div>
      <Grid container direction="column" justify="flex-start" className={classes.container}>
        <Grid item>
          {/* Header */}
          {isLoadingMoleculeList === false && (
            <Grid container justify="flex-start" direction="row" className={classes.molHeader} wrap="nowrap">
              <Grid item container justify="flex-start" direction="row">
                <Tooltip title="Total count of compounds">
                  <Grid item className={classes.rank}>
                    {`Total ${joinedMoleculeLists?.length}`}
                  </Grid>
                </Tooltip>
                {datasetID &&
                  filteredScoreProperties &&
                  filteredScoreProperties[datasetID] &&
                  filteredScoreProperties[datasetID].map(score => (
                    <Tooltip key={score.id} title={`${score.name} - ${score.description}`}>
                      <Grid item className={classes.rightBorder}>
                        {score?.name?.substring(0, 4)}
                      </Grid>
                    </Tooltip>
                  ))}
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
                              [classes.contColButtonSelected]: isLigandOn
                            })}
                            onClick={() => onButtonToggle('ligand')}
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
                              [classes.contColButtonSelected]: isProteinOn
                            })}
                            onClick={() => onButtonToggle('protein')}
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
                              [classes.contColButtonSelected]: isComplexOn
                            })}
                            onClick={() => onButtonToggle('complex')}
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
          )}
        </Grid>
        {isLoadingMoleculeList && (
          <Grid item container alignItems="center" justify="center" className={classes.loading}>
            <Grid item>
              <CircularProgress />
            </Grid>
          </Grid>
        )}
        {isLoadingMoleculeList === false && currentMolecules.length > 0 && (
          <>
            <Grid item className={classes.gridItemList} ref={scrollBarRef}>
              <InfiniteScroll
                getScrollParent={() =>
                  dispatch(
                    autoHideDatasetDialogsOnScroll({
                      inspirationDialogRef,
                      crossReferenceDialogRef,
                      scrollBarRef
                    })
                  )
                }
                pageStart={0}
                loadMore={loadNextMolecules}
                hasMore={canLoadMore}
                loader={
                  <div className="loader" key={0}>
                    <Grid
                      container
                      direction="row"
                      justify="center"
                      alignItems="center"
                      className={classes.paddingProgress}
                    >
                      <CircularProgress />
                    </Grid>
                  </div>
                }
                useWindow={false}
              >
                {datasetID && (
                  <GroupDatasetNglControlButtonsContext.Provider value={groupDatasetsNglControlButtonsDisabledState}>
                    <DndProvider backend={HTML5Backend}>
                      {currentMolecules.map((data, index, array) => {
                        const isCheckedToBuy = selectedMolecules.some(molecule => molecule.id === data.id);

                        return (
                          <DatasetMoleculeView
                            ref={addMoleculeViewRef}
                            key={data.id}
                            index={index}
                            imageHeight={imgHeight}
                            imageWidth={imgWidth}
                            data={data}
                            datasetID={datasetID}
                            setRef={setSelectedMoleculeRef}
                            showCrossReferenceModal
                            previousItemData={index > 0 && array[index - 1]}
                            nextItemData={index < array?.length && array[index + 1]}
                            L={ligandList.includes(data.id)}
                            P={proteinList.includes(data.id)}
                            C={complexList.includes(data.id)}
                            S={surfaceList.includes(data.id)}
                            V={false}
                            moveMolecule={moveMolecule}
                            isCheckedToBuy={isCheckedToBuy}
                            disableL={isCheckedToBuy && groupDatasetsNglControlButtonsDisabledState.ligand}
                            disableP={isCheckedToBuy && groupDatasetsNglControlButtonsDisabledState.protein}
                            disableC={isCheckedToBuy && groupDatasetsNglControlButtonsDisabledState.complex}
                            dragDropEnabled
                          />
                        );
                      })}
                    </DndProvider>
                  </GroupDatasetNglControlButtonsContext.Provider>
                )}
              </InfiniteScroll>
            </Grid>
            <Grid item>
              <Grid container justify="space-between" alignItems="center" direction="row">
                <Grid item>
                  <span className={classes.total}>{`Total ${joinedMoleculeLists?.length}`}</span>
                </Grid>
                <Grid item>
                  <ButtonGroup variant="text" size="medium" color="primary" aria-label="contained primary button group">
                    <Button
                      onClick={() => {
                        setNextXMolecules(30);
                      }}
                    >
                      Load next 30
                    </Button>
                    <Button
                      onClick={() => {
                        setNextXMolecules(100);
                      }}
                    >
                      Load next 100
                    </Button>
                    <Button
                      onClick={() => {
                        if (joinedMoleculeLists?.length > 300) {
                          setIsOpenAlert(true);
                        } else {
                          setNextXMolecules(joinedMoleculeLists?.length || 0);
                        }
                      }}
                    >
                      Load full list
                    </Button>
                  </ButtonGroup>
                </Grid>
              </Grid>
            </Grid>
          </>
        )}
      </Grid>
    </Panel>
  );
};

export default memo(DatasetMoleculeList);
