/**
 * Created by abradley on 03/03/2018.
 */
import {
  SET_TARGET_ON,
  SET_TARGET_ID_LIST,
  SET_MOLECULE_LIST,
  SET_CACHED_MOL_LISTS,
  SET_MOL_GROUP_LIST,
  SET_MOL_GROUP_ON,
  SET_PANNDA_EVENT_LIST,
  SET_PANNDA_EVENT_ON,
  SET_PANNDA_SITE_ON,
  SET_PANNDA_SITE_LIST,
  SET_DUCK_YANK_DATA,
  RELOAD_API_STATE,
  SET_SAVING_STATE,
  SET_SESH_LIST_SAVING,
  SET_LATEST_SNAPSHOT,
  SET_LATEST_SESSION,
  SET_SESSION_TITLE,
  SET_SESSION_ID,
  SET_SESSION_ID_LIST,
  UPDATE_SESSION_ID_LIST,
  SET_TARGET_UNRECOGNISED,
  SET_UUID,
  RESET_TARGET_STATE
} from '../actonTypes';

export const setTargetIdList = function(input_json) {
  return {
    type: SET_TARGET_ID_LIST,
    target_id_list: input_json
  };
};

export const setDuckYankData = function(input_json) {
  return {
    type: SET_DUCK_YANK_DATA,
    duck_yank_data: input_json
  };
};

export const setTargetOn = function(target_id) {
  return {
    type: SET_TARGET_ON,
    target_on: target_id
  };
};

export const setPanddaSiteList = function(pandda_site_list) {
  return {
    type: SET_PANNDA_SITE_LIST,
    pandda_site_list: pandda_site_list
  };
};

export const setPanddaEventList = function(pandda_event_list) {
  return {
    type: SET_PANNDA_EVENT_LIST,
    pandda_event_list: pandda_event_list
  };
};

export const setPanddaSiteOn = function(pandda_site_id) {
  return {
    type: SET_PANNDA_SITE_ON,
    pandda_site_id: pandda_site_id
  };
};
export const setPanddaEventOn = function(pandda_event_id) {
  return {
    type: SET_PANNDA_EVENT_ON,
    pandda_event_id: pandda_event_id
  };
};

export const setMolGroupOn = function(mol_group_id) {
  return {
    type: SET_MOL_GROUP_ON,
    mol_group_on: mol_group_id
  };
};

export const setMolGroupList = function(mol_group_list) {
  return {
    type: SET_MOL_GROUP_LIST,
    mol_group_list: mol_group_list
  };
};

export const setMoleculeList = function(molecule_list) {
  return {
    type: SET_MOLECULE_LIST,
    molecule_list: molecule_list
  };
};

export const setCachedMolLists = function(cached_mol_lists) {
  return {
    type: SET_CACHED_MOL_LISTS,
    cached_mol_lists: cached_mol_lists
  };
};

export const setSavingState = function(savingState) {
  return {
    type: SET_SAVING_STATE,
    savingState: savingState
  };
};

export const setSeshListSaving = function(seshListSaving) {
  return {
    type: SET_SESH_LIST_SAVING,
    seshListSaving
  };
};

export const setLatestSnapshot = function(uuid) {
  return {
    type: SET_LATEST_SNAPSHOT,
    latestSnapshot: uuid
  };
};

export const setLatestSession = function(uuid) {
  return {
    type: SET_LATEST_SESSION,
    latestSession: uuid
  };
};

export const setSessionTitle = function(sessionTitle) {
  return {
    type: SET_SESSION_TITLE,
    sessionTitle: sessionTitle
  };
};

export const setSessionId = function(id) {
  return {
    type: SET_SESSION_ID,
    sessionId: id
  };
};

export const setSessionIdList = function(input_json) {
  return {
    type: SET_SESSION_ID_LIST,
    sessionIdList: input_json
  };
};

export const updateSessionIdList = function(input_json) {
  return {
    type: UPDATE_SESSION_ID_LIST,
    sessionIdList: input_json
  };
};

export const setTargetUnrecognised = function(bool) {
  return {
    type: SET_TARGET_UNRECOGNISED,
    targetUnrecognised: bool
  };
};

export const setUuid = function(uuid) {
  return {
    type: SET_UUID,
    uuid: uuid
  };
};

export const reloadApiState = function(apiReducers) {
  return {
    type: RELOAD_API_STATE,
    target_on_name: apiReducers.target_on_name,
    target_on: apiReducers.target_on,
    target_id: apiReducers.target_id,
    molecule_list: apiReducers.molecule_list,
    cached_mol_lists: apiReducers.cached_mol_lists,
    mol_group_list: apiReducers.mol_group_list,
    mol_group_on: apiReducers.mol_group_on,
    hotspot_list: apiReducers.hotspot_list,
    hotspot_on: apiReducers.hotspot_on,
    app_on: apiReducers.app_on,
    sessionIdList: apiReducers.sessionIdList,
    latestSession: apiReducers.latestSession,
    project_id: apiReducers.project_id,
    group_id: apiReducers.group_id,
    group_type: apiReducers.group_type,
    pandda_event_on: apiReducers.pandda_event_on,
    pandda_site_on: apiReducers.pandda_site_on,
    pandda_event_list: apiReducers.pandda_event_list,
    pandda_site_list: apiReducers.pandda_site_list
  };
};

export const resetTargetState = () => ({ type: RESET_TARGET_STATE });
