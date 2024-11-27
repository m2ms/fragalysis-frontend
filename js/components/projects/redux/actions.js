import { constants } from './constants';

export const setSortDialogOpen = isOpen => ({
  type: constants.SET_SORT_DIALOG_OPEN,
  payload: isOpen
});

export const setDefaultFilter = isClean => ({
  type: constants.SET_FILTER_CLEAN,
  payload: isClean
});

export const setCurrentProject = ({ projectID, authorID, title, description, targetID, tags, type }) => ({
  type: constants.SET_CURRENT_PROJECT,
  payload: { projectID, authorID, title, description, targetID, tags, type }
});

export const setCurrentProjectProperty = (key, value) => ({
  type: constants.SET_CURRENT_PROJECT_PROPERTY,
  payload: { key, value }
});

export const resetProjectState = () => ({
  type: constants.RESET_CURRENT_PROJECT_STATE
});

export const setProjectModalOpen = isOpen => ({
  type: constants.SET_PROJECT_MODAL_OPEN,
  payload: isOpen
});

export const setAddButton = isOpen => ({
  type: constants.SET_ADD_BUTTON,
  payload: isOpen
});

export const setProjectModalIsLoading = isLoading => ({
  type: constants.SET_PROJECT_MODAL_IS_LOADING,
  payload: isLoading
});

export const setCurrentSnapshot = currentSnapshot => ({
  type: constants.SET_SNAPSHOT,
  payload: { currentSnapshot }
});

export const setCurrentSnapshotProperty = (key, value) => ({
  type: constants.SET_CURRENT_SNAPSHOT_PROPERTY,
  payload: { key, value }
});

export const resetCurrentSnapshot = () => ({
  type: constants.RESET_SNAPSHOT
});

export const setIsLoadingCurrentSnapshot = isLoading => ({
  type: constants.SET_IS_LOADING_CURRENT_SNAPSHOT,
  payload: isLoading
});

export const resetProjectsReducer = () => ({ type: constants.RESET_PROJECTS_REDUCER });

export const resetLoadedSnapshots = () => ({ type: constants.RESET_LOADED_SNAPSHOTS });

export const setListOfProjects = projects => ({
  type: constants.SET_LIST_OF_PROJECTS,
  payload: projects
});

export const setListOfFilteredProjects = projects => ({
  type: constants.SET_LIST_OF_FILTERED_PROJECTS,
  payload: projects
});

export const setListOfFilteredProjectsByDate = projects => ({
  type: constants.SET_LIST_OF_FILTERED_PROJECTS_BY_DATE,
  payload: projects
});

export const setIsLoadingListOfProjects = isLoading => ({
  type: constants.SET_IS_LOADING_LIST_OF_PROJECTS,
  payload: isLoading
});

export const setIsLoadingTree = isLoading => ({
  type: constants.SET_IS_LOADING_TREE,
  payload: isLoading
});

export const setCurrentSnapshotTree = tree => {
  return { type: constants.SET_CURRENT_SNAPSHOT_TREE, payload: tree };
};

export const setCurrentSnapshotList = list => ({
  type: constants.SET_CURRENT_SNAPSHOT_LIST,
  payload: list
});

export const setSnapshotJobList = data => ({
  type: constants.SET_CURRENT_SNAPSHOT_JOBLIST,
  payload: data
});

export const setForceCreateProject = isForce => ({
  type: constants.SET_FORCE_CREATE_PROJECT,
  payload: isForce
});

export const setForceProjectCreated = isCreated => ({
  type: constants.SET_FORCE_PROJECT_CREATED,
  payload: isCreated
});

export const setProjectDiscourseLinks = links => ({
  type: constants.SET_PROJECT_DISCOURSE_LINKS,
  payload: links
});

export const setCurrentProjectDiscourseLink = link => ({
  type: constants.SET_CURRENT_PROJECT_DISCOURSE_LINK,
  payload: link
});

export const setJobPopUpAnchorEl = jobPopUpAnchorEl => ({
  type: constants.SET_JOB_POP_UP_ANCHOR_EL,
  payload: jobPopUpAnchorEl
});

export const setJobConfigurationDialogOpen = open => ({
  type: constants.SET_JOB_CONFIGURATION_DIALOG_OPEN,
  payload: open
});

export const setJobLauncherDialogOpen = open => ({
  type: constants.SET_JOB_LAUNCHER_DIALOG_OPEN,
  payload: open
});

export const setJobLauncherData = jobLauncherData => ({
  type: constants.SET_JOB_LAUNCHER_DATA,
  payload: jobLauncherData
});

export const setJobLauncherSquonkUrl = squonkUrl => ({
  type: constants.SET_JOB_LAUNCHER_SQUONK_URL,
  payload: squonkUrl
});

export const setJobList = jobList => ({
  type: constants.SET_JOB_LIST,
  jobList: jobList
});

export const refreshJobsData = () => {
  return {
    type: constants.REFRESH_JOBS_DATA
  };
};

export const setSearchName = searchName => {
  return {
    type: constants.SEARCH_NAME,
    payload: searchName
  };
};

export const setSearchTarget = searchTarget => {
  return {
    type: constants.SEARCH_TARGET,
    payload: searchTarget
  };
};

export const setSearchTargetAccessString = searchTargetAccessString => {
  return {
    type: constants.SEARCH_TARGET_ACCESS_STRING,
    payload: searchTargetAccessString
  };
};

export const setSearchDescription = searchDescription => {
  return {
    type: constants.SEARCH_DESCRIPTION,
    payload: searchDescription
  };
};

export const setSearchAuthority = searchAuthority => {
  return {
    type: constants.SEARCH_AUTHORITY,
    payload: searchAuthority
  };
};
export const setSearchDateFrom = searchDateFrom => {
  return {
    type: constants.SEARCH_DATE_FROM,
    payload: searchDateFrom
  };
};

export const setSearchDateTo = searchDateTo => {
  return {
    type: constants.SEARCH_DATE_TO,
    payload: searchDateTo
  };
};
