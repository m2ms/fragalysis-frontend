import React, { memo, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useRouteMatch } from 'react-router-dom';
import { getAllData } from './api/tagsApi';

export const withLoadingMolecules = WrappedComponent => {
  return memo(({ ...rest }) => {
    let match = useRouteMatch();

    const target = match && match.params && match.params.target;
    const dispatch = useDispatch();

    useEffect(() => {
      const allData = getAllData(target);
    }, [dispatch, target]);

    return <WrappedComponent {...rest} />;
  });
};
