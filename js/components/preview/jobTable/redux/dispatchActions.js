import { setSelectedDatasetIndex, setTabValue } from '../../../datasets/redux/actions';
import { turnSide } from '../../viewerControls/redux/actions';

export const selectDatasetResultsForJob = jobInfo => (dispatch, getState) => {
  const state = getState();
  const datasetsList = state.datasetsReducers.datasets;
  const currentDatasetIndex = state.datasetsReducers.selectedDatasetIndex;
  const tabValue = state.datasetsReducers.tabValue;
  let datasetIndex = datasetsList.findIndex(dataset => dataset.id === jobInfo.computed_set);
  console.log(`Found dataset index ${datasetIndex} for job ${JSON.stringify(jobInfo)}`);
  if (datasetIndex >= 0) {
    dispatch(turnSide('RHS', true));
    const oldTitle = datasetsList[currentDatasetIndex]?.title;
    const newTitle = datasetsList[datasetIndex]?.title;
    // datasetIndex = datasetIndex + 2;
    console.log(`Selecting dataset index ${datasetIndex}`);
    console.log(
      `from job table - currentDatasetIndex: ${currentDatasetIndex} datasetIndex: ${datasetIndex} newTitle: ${newTitle} oldTitle: ${oldTitle}`
    );
    dispatch(setSelectedDatasetIndex(currentDatasetIndex, datasetIndex, newTitle, oldTitle));
    dispatch(setTabValue(tabValue, 2, oldTitle, newTitle));
  }
};
