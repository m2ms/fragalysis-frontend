import React, { memo, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { loadProjectsList } from './redux/dispatchActions';
import { setProjects } from './redux/actions';

export const withLoadingProjects = WrappedComponent => {
  return memo(({ ...rest }) => {
    const dispatch = useDispatch();

    useEffect(() => {
      let onCancel = () => {};
      dispatch(loadProjectsList(onCancel))
        .then(resp => {
          dispatch(setProjects(resp));
        })
        .catch(error => {
          throw new Error(error);
        });
      return () => {
        onCancel();
      };
    }, [dispatch]);

    return <WrappedComponent {...rest} />;
  });
};
