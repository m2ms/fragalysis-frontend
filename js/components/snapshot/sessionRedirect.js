import React, { memo, useContext, useEffect, useState } from 'react';
import { api } from '../../utils/api';
import { base_url, URLS } from '../routes/constants';
import { useHistory, useRouteMatch } from 'react-router-dom';
import { HeaderContext } from '../header/headerContext';
import { setIsLoadingCurrentSnapshot } from '../projects/redux/actions';
import { useDispatch } from 'react-redux';

export const SessionRedirect = memo(() => {
  const dispatch = useDispatch();
  let history = useHistory();
  let match = useRouteMatch();
  const sessionUUID = match && match.params && match.params.sessionUUID;
  const { setSnackBarTitle } = useContext(HeaderContext);

  useEffect(() => {
    dispatch(setIsLoadingCurrentSnapshot(true));
    api({ url: `${base_url}/api/viewscene/?uuid=${sessionUUID}` })
      .then(response => {
        if (response.data && response.data.results && response.data.results.length === 1) {
          const session = response.data.results[0];
          if (session.snapshot) {
            return api({ url: `${base_url}/api/snapshots/${session.snapshot}` }).then(res => {
              if (res.data && res.data.session_project && res.data.session_project.id) {
                history.push(`${URLS.projects}${res.data.session_project.id}/${session.snapshot}`);
              } else {
                return Promise.reject('Project is not found!');
              }
            });
          } else {
            return Promise.reject('Snapshot is not found!');
          }
        } else {
          return Promise.reject('Session is not found!');
        }
      })
      .catch(error => {
        setSnackBarTitle(error);
      })
      .finally(() => {
        dispatch(setIsLoadingCurrentSnapshot(false));
      });
  }, [dispatch, history, sessionUUID, setSnackBarTitle]);

  return null;
});
