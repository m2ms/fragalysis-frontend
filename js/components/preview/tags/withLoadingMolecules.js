import React, { memo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getAllData } from './api/tagsApi';
import { setAllMolecules, setAllMolLists } from '../../../reducers/api/actions';
import { setTagSelectorData } from '../tags/redux/dispatchActions';

export const withLoadingMolecules = WrappedComponent => {
  return memo(({ ...rest }) => {
    const dispatch = useDispatch();

    const target_on = useSelector(state => state.apiReducers.target_on);

    useEffect(() => {
      if (target_on) {
        getAllData(target_on).then(data => {
          let allMolecules = [];
          data.molecules.forEach(mol => {
            let molData = mol.data;
            molData['tags_set'] = mol.tags_set;

            allMolecules.push(molData);
          });
          dispatch(setAllMolecules([...allMolecules]));
          dispatch(setAllMolLists([...allMolecules]));

          const tags = data.tags_info;
          const categories = data.tag_categories;

          dispatch(setTagSelectorData(categories, tags));
        });
      }
    }, [dispatch, target_on]);

    return <WrappedComponent {...rest} />;
  });
};
