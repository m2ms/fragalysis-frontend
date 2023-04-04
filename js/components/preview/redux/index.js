import { combineReducers } from 'redux';
import { summary } from '../summary/redux/reducer';
import { vectorCompounds } from '../vectorCompounds/redux/reducer';
import { molecule } from '../molecule/redux/reducer';
import { viewerControls } from '../viewerControls/redux/reducer';

export const previewReducers = combineReducers({
  summary,
  vectorCompounds,
  molecule,
  viewerControls
});
