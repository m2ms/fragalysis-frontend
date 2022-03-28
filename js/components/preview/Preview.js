/**
 * Created by abradley on 14/04/2018.
 */

import React, { memo, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Grid, makeStyles, ButtonGroup, Button } from '@material-ui/core';
import NGLView from '../nglView/nglView';
import HitNavigator from './molecule/hitNavigator';
import { CustomDatasetList } from '../datasets/customDatasetList';
import TagSelector from './tags/tagSelector';
import TagDetails from './tags/details/tagDetails';
import { SummaryView } from './summary/summaryView';
import { CompoundList } from './compounds/compoundList';
import { withUpdatingTarget } from '../target/withUpdatingTarget';
import { VIEWS } from '../../constants/constants';
import { withLoadingProtein } from './withLoadingProtein';
import { withSnapshotManagement } from '../snapshot/withSnapshotManagement';
import { useDispatch, useSelector } from 'react-redux';
import { ProjectHistory } from './projectHistory';
import { ProjectDetailDrawer } from '../projects/projectDetailDrawer';
import { NewSnapshotModal } from '../snapshot/modals/newSnapshotModal';
import { HeaderContext } from '../header/headerContext';
import { unmountPreviewComponent } from './redux/dispatchActions';
import { NglContext } from '../nglView/nglProvider';
import { SaveSnapshotBeforeExit } from '../snapshot/modals/saveSnapshotBeforeExit';
import { ModalShareSnapshot } from '../snapshot/modals/modalShareSnapshot';
import { DownloadStructureDialog } from '../snapshot/modals/downloadStructuresDialog';
//import HotspotList from '../hotspot/hotspotList';
import { TabPanel } from '../common/Tabs';
import { loadDatasetCompoundsWithScores, loadDataSets } from '../datasets/redux/dispatchActions';
import { SelectedCompoundList } from '../datasets/selectedCompoundsList';
import { DatasetSelectorMenuButton } from '../datasets/datasetSelectorMenuButton';
import ArrowDropDownIcon from '@material-ui/icons/ArrowDropDown';
import {
  setMoleculeListIsLoading,
  setSelectedDatasetIndex,
  setTabValue,
  setAllInspirations
} from '../datasets/redux/actions';
import { prepareFakeFilterData } from './compounds/redux/dispatchActions';
import { withLoadingMolecules } from './tags/withLoadingMolecules';
import classNames from 'classnames';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import RGL, { WidthProvider } from 'react-grid-layout';
import { setCurrentLayout } from '../../reducers/layout/actions';

const useStyles = makeStyles(theme => ({
  root: {
    minHeight: 'inherit',
    display: 'flex',
    gap: theme.spacing(),
    flexWrap: 'wrap'
  },
  nglColumn: {
    // Since the LHS and RHS columns require flex-grow to be 1 in case they are wrapped, this is needed to make NGL take
    // all of the space in case they are not wrapped
    flex: '9999 1 0'
  },
  columnHidden: {
    display: 'none'
  },
  tabButtonGroup: {
    height: 48
  },
  rhsWrapper: {
    overflow: 'hidden',
    height: '100%'
  },
  rhs: {
    overflowY: 'auto',
    height: '100%',
    flexWrap: 'nowrap',
    overflowX: 'hidden'
  },
  rhsContainer: {
    height: '100%',
    flexWrap: 'nowrap'
  },
  summaryView: {
    flexGrow: 1
  },
  tabPanel: {
    flexGrow: 1
  }
}));

const Preview = memo(({ isStateLoaded, hideProjects }) => {
  const classes = useStyles();

  const { nglViewList } = useContext(NglContext);
  const dispatch = useDispatch();

  dispatch(prepareFakeFilterData());

  const customDatasets = useSelector(state => state.datasetsReducers.datasets);
  const selectedDatasetIndex = useSelector(state => state.datasetsReducers.selectedDatasetIndex);
  const currentDataset = customDatasets[selectedDatasetIndex];
  const target_on = useSelector(state => state.apiReducers.target_on);
  const isTrackingRestoring = useSelector(state => state.trackingReducers.isTrackingCompoundsRestoring);

  const all_mol_lists = useSelector(state => state.apiReducers.all_mol_lists);
  const moleculeLists = useSelector(state => state.datasetsReducers.moleculeLists);
  const isLoadingMoleculeList = useSelector(state => state.datasetsReducers.isLoadingMoleculeList);
  const tabValue = useSelector(state => state.datasetsReducers.tabValue);
  const layout = useSelector(state => state.layoutReducers.currentLayout);

  //const ReactGridLayout = WidthProvider(RGL);
  const ReactGridLayout = RGL;

  /*
     Loading datasets
   */
  useEffect(() => {
    if (customDatasets.length === 0 && isTrackingRestoring === false) {
      dispatch(setMoleculeListIsLoading(true));
      dispatch(loadDataSets(target_on))
        .then(results => {
          if (Array.isArray(results) && results.length > 0) {
            let defaultDataset = results[0]?.unique_name;
            dispatch(setSelectedDatasetIndex(0, 0, defaultDataset, defaultDataset, true));
          }
          return dispatch(loadDatasetCompoundsWithScores());
        })
        .catch(error => {
          throw new Error(error);
        })
        .finally(() => {
          dispatch(setMoleculeListIsLoading(false));
        });
    }
  }, [customDatasets.length, dispatch, target_on, isTrackingRestoring]);

  useEffect(() => {
    const moleculeListsCount = Object.keys(moleculeLists || {}).length;
    if (moleculeListsCount > 0 && !isLoadingMoleculeList) {
      const allDatasets = {};
      const allMolsMap = linearizeMoleculesLists();
      const keys = Object.keys(moleculeLists);
      keys.forEach(key => {
        let dataset = moleculeLists[key];
        let mols = {};
        dataset.forEach(dsMol => {
          let inspirations = [];
          dsMol.computed_inspirations.forEach(id => {
            let lhsMol = allMolsMap[id];
            inspirations.push(lhsMol);
          });
          mols[dsMol.id] = inspirations;
        });
        allDatasets[key] = mols;
      });
      dispatch(setAllInspirations(allDatasets));
    }
  }, [all_mol_lists, moleculeLists, isLoadingMoleculeList, linearizeMoleculesLists, dispatch]);

  const linearizeMoleculesLists = useCallback(() => {
    const allMolsMap = {};

    if (all_mol_lists && all_mol_lists.length > 0) {
      all_mol_lists.forEach(mol => {
        allMolsMap[mol.id] = mol;
      });
    }

    return allMolsMap;
  }, [all_mol_lists]);

  const [showHistory, setShowHistory] = useState(false);

  const getTabValue = () => {
    if (tabValue === 2) {
      return tabValue + selectedDatasetIndex;
    }
    return tabValue;
  };

  const getTabName = () => {
    if (tabValue === 0) {
      return 'Vector selector';
    }
    if (tabValue === 1) {
      return 'Selected compounds';
    }
    if (tabValue >= 2) {
      return currentDataset?.title;
    }
    return '';
  };

  useEffect(() => {
    // Unmount Preview - reset NGL state
    return () => {
      dispatch(unmountPreviewComponent(nglViewList));
    };
  }, [dispatch, nglViewList]);

  const anchorRefDatasetDropdown = useRef(null);
  const [openDatasetDropdown, setOpenDatasetDropdown] = useState(false);

  const sidesOpen = useSelector(state => state.previewReducers.viewerControls.sidesOpen);

  const onLayoutChange = updatedLayout => {
    let newLayout = { name: layout.name, layout: [...updatedLayout] };
    dispatch(setCurrentLayout(newLayout));
  };

  return (
    <>
      <div className={classes.root}>
        <ReactGridLayout
          // cols={4}
          cols={190}
          layout={layout.layout}
          width={1900 /*3 * columnWidth*/}
          rowHeight={5}
          onLayoutChange={onLayoutChange}
        >
          <div key="tagDetails">
            <TagDetails />
          </div>
          <div key="hitListFilter">
            <TagSelector />
          </div>
          <div key="hitNavigator">
            <HitNavigator hideProjects={hideProjects} />
          </div>
          <div key="NGL" className={classes.nglColumn}>
            <NGLView div_id={VIEWS.MAJOR_VIEW} />
            {/**
             * Make separate layouts for these
             * <ViewerControls />
              {!hideProjects && <ProjectHistory showFullHistory={() => setShowHistory(!showHistory)} />}
             */}
          </div>
          <div key="RHS">
            <div className={classes.rhsWrapper}>
              <Grid
                className={classNames(classes.rhs, !sidesOpen.RHS && classes.columnHidden)}
                container
                direction="column"
              >
                <ButtonGroup
                  color="primary"
                  variant="contained"
                  aria-label="outlined primary button group"
                  className={classes.tabButtonGroup}
                >
                  <Button
                    size="small"
                    variant={getTabValue() === 0 ? 'contained' : 'text'}
                    onClick={() => dispatch(setTabValue(tabValue, 0, 'Vector selector', getTabName()))}
                  >
                    Vector selector
                  </Button>
                  <Button
                    size="small"
                    variant={getTabValue() === 1 ? 'contained' : 'text'}
                    onClick={() => dispatch(setTabValue(tabValue, 1, 'Selected compounds', getTabName()))}
                  >
                    Selected compounds
                  </Button>
                  <Button
                    size="small"
                    variant={getTabValue() >= 2 ? 'contained' : 'text'}
                    onClick={() => dispatch(setTabValue(tabValue, 2, currentDataset?.title, getTabName()))}
                  >
                    {currentDataset?.title}
                  </Button>
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => {
                      setOpenDatasetDropdown(prevOpen => !prevOpen);
                    }}
                    ref={anchorRefDatasetDropdown}
                    className={classes.dropDown}
                  >
                    <ArrowDropDownIcon />
                  </Button>
                </ButtonGroup>
                <DatasetSelectorMenuButton
                  anchorRef={anchorRefDatasetDropdown}
                  open={openDatasetDropdown}
                  setOpen={setOpenDatasetDropdown}
                  customDatasets={customDatasets}
                  selectedDatasetIndex={selectedDatasetIndex}
                  setSelectedDatasetIndex={setSelectedDatasetIndex}
                />
                <TabPanel value={getTabValue()} index={0} className={classes.tabPanel}>
                  {/* Vector selector */}
                  <Grid container direction="column" spacing={1} className={classes.rhsContainer}>
                    <Grid item className={classes.summaryView}>
                      <SummaryView />
                    </Grid>
                    <Grid item>
                      <CompoundList />
                    </Grid>
                  </Grid>
                </TabPanel>
                <TabPanel value={getTabValue()} index={1} className={classes.tabPanel}>
                  <SelectedCompoundList />
                </TabPanel>
                {customDatasets.map((dataset, index) => {
                  return (
                    <TabPanel key={index + 2} value={getTabValue()} index={index + 2} className={classes.tabPanel}>
                      <Grid item>
                        <CustomDatasetList
                          dataset={dataset}
                          hideProjects={hideProjects}
                          isActive={sidesOpen.RHS && index === selectedDatasetIndex}
                        />
                      </Grid>
                    </TabPanel>
                  );
                })}
              </Grid>
            </div>
          </div>
          {/*<Grid item xs={12} sm={6} md={4} >
          <HotspotList />
        </Grid>*/}
        </ReactGridLayout>
      </div>
      <NewSnapshotModal />
      <ModalShareSnapshot />
      <SaveSnapshotBeforeExit />
      <DownloadStructureDialog />
      {!hideProjects && <ProjectDetailDrawer showHistory={showHistory} setShowHistory={setShowHistory} />}
    </>
  );
});

export default withSnapshotManagement(withUpdatingTarget(withLoadingProtein(withLoadingMolecules(Preview))));
