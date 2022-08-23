import React, { memo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getTagMolecules } from './api/tagsApi';
import { setMoleculeTags } from '../../../reducers/api/actions';
import { loadMoleculesAndTags } from '../tags/redux/dispatchActions';
import { compareTagsAsc } from '../tags/utils/tagUtils';

export const withLoadingMolecules = WrappedComponent => {
  return memo(({ ...rest }) => {
    const dispatch = useDispatch();

    const target_on = useSelector(state => state.apiReducers.target_on);
    const isTrackingRestoring = useSelector(state => state.trackingReducers.isTrackingCompoundsRestoring);
    const isAllDataLoaded = useSelector(state => state.apiReducers.all_data_loaded);

    useEffect(() => {
      if (target_on && !isTrackingRestoring && !isAllDataLoaded) {
        dispatch(loadMoleculesAndTags(target_on));
      }
    }, [dispatch, target_on, isTrackingRestoring, isAllDataLoaded]);

    useEffect(() => {
      if (target_on) {
        getTagMolecules(target_on).then(data => {
          const sorted = data.results.sort(compareTagsAsc);
          dispatch(setMoleculeTags(sorted));
        });
      }
    }, [dispatch, target_on]);

    return <WrappedComponent {...rest} />;
  });
};
