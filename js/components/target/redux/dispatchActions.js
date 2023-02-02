import * as listType from '../../../constants/listTypes';
import { getUrl, loadFromServer } from '../../../utils/genericList';
import {
  resetTargetState,
  setTargetIdList,
  setTargetOn,
  setTargetUnrecognised,
  setUuid
} from '../../../reducers/api/actions';
import { setIsTargetLoading, setOldUrl } from './actions';
import { api, METHOD } from '../../../utils/api';
import { resetSelectionState } from '../../../reducers/selection/actions';
import { base_url } from '../../routes/constants';
import { setCurrentProject } from '../../projects/redux/actions';
import { setCurrentProject as setProject } from './actions';

export const loadTargetList = onCancel => (dispatch, getState) => {
  const oldUrl = getState().targetReducers.oldUrl;
  const list_type = listType.TARGET;
  dispatch(setIsTargetLoading(true));
  return loadFromServer({
    url: getUrl({ list_type }),
    setOldUrl: url => {
      dispatch(setOldUrl(url));
      dispatch(setIsTargetLoading(false));
    },
    old_url: oldUrl,
    setObjectList: params => dispatch(setTargetIdList(params)),
    list_type,
    cancel: onCancel
  });
};

export const loadProjectsList = () => async (dispatch, getState) => {
  const url = `${base_url}/api/projects/`;
  const resp = await api({ url, method: METHOD.GET });
  return resp.data.results;
};

export const updateTarget = ({ target, setIsLoading, targetIdList, projectId }) => (dispatch, getState) => {
  const isActionRestoring = getState().trackingReducers.isActionRestoring;

  // Get from the REST API
  let targetUnrecognisedFlag = true;
  // if (target !== undefined) {
  if (target) {
    if (targetIdList && targetIdList.length > 0) {
      targetIdList.forEach(targetId => {
        if (target === targetId.title) {
          targetUnrecognisedFlag = false;
        }
      });
    }
    dispatch(setTargetUnrecognised(targetUnrecognisedFlag));
  } else if (projectId !== undefined) {
    targetUnrecognisedFlag = false;
    dispatch(setTargetUnrecognised(targetUnrecognisedFlag));
  }
  // for Targets
  if (targetUnrecognisedFlag === false) {
    setIsLoading(true);
    let url = undefined;
    if (target) {
      url = `${base_url}/api/targets/?title=${target}`;
      return api({ url })
        .then(response => {
          return dispatch(setTargetOn(response.data['results'][0].id));
        })
        .finally(() => setIsLoading(false));
    }
    // for Projects
    else if (projectId !== undefined) {
      setIsLoading(true);
      return api({ url: `${base_url}/api/session-projects/${projectId}/` })
        .then(response => {
          let promises = [];
          if (!isActionRestoring || isActionRestoring === false) {
            promises.push(dispatch(setTargetOn(response.data.target.id, true)));
            promises.push(
              dispatch(
                setCurrentProject({
                  projectID: response.data.id,
                  authorID: response.data.author || null,
                  title: response.data.title,
                  description: response.data.description,
                  targetID: response.data.target.id,
                  tags: JSON.parse(response.data.tags)
                })
              )
            );
            promises.push(dispatch(setProject(response.data.project)));
          }

          return Promise.all(promises);
        })
        .finally(() => setIsLoading(false));
    }
  }
  return Promise.resolve();
};

export const setTargetUUIDs = (uuid, snapshotUuid) => dispatch => {
  if (uuid !== undefined) {
    dispatch(setUuid(uuid));
  } else if (snapshotUuid !== undefined) {
    dispatch(setUuid(snapshotUuid));
  }
};

export const resetTargetAndSelection = resetSelection => dispatch => {
  if (resetSelection) {
    dispatch(resetTargetState());
    dispatch(resetSelectionState());
  }
};

export const getTargetProjectCombinations = (targets, projects) => {
  const result = [];

  const targetItems = Object.entries(targets);

  if (targetItems.length > 0 && projects?.length > 0) {
    targetItems.forEach(([targetId, target]) => {
      target.project_id.forEach(projectId => {
        const project = projects.find(project => project.id === projectId);
        // const project = projects[projectId];
        result.push({ target, project });
      });
    });
  }

  return result;
};
