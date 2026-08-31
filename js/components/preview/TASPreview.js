import React, { memo, useContext, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory, useRouteMatch } from 'react-router-dom';
import { URLS } from '../routes/constants';
import { setCurrentProject, setOpenPickProjectModal } from '../target/redux/actions';
import Preview from './Preview';
import { getProjectForProjectName, getProjectsForSelectedTarget } from './redux/dispatchActions';
import { extractProjectFromURLParam } from './utils';
import { ToastContext } from '../toast';
import { DJANGO_CONTEXT } from '../../utils/djangoContext';
import { TooltipPathProvider } from '../tooltip/TooltipPathContext';
import { readStoredPreviewState, restorePreviewStateFromLogin, clearStoredPreviewState } from './loginStatePersistence';
import { setIsSnapshot } from '../../reducers/api/actions';
import { NglContext } from '../nglView/nglProvider';
import { VIEWS } from '../../constants/constants';

export const TASPreview = memo(props => {
  let match = useRouteMatch();
  const dispatch = useDispatch();
  let history = useHistory();

  const currentPorject = useSelector(state => state.targetReducers.currentProject);
  const currentTarget = useSelector(state => state.apiReducers.target_on);
  const targetList = useSelector(state => state.apiReducers.target_id_list);
  const projectsLoaded = useSelector(state => state.targetReducers.projectsLoaded);
  const lhsDataIsLoaded = useSelector(state => state.apiReducers.lhsDataIsLoaded);

  const { toastWarning } = useContext(ToastContext);

  const { getViewerAdapter } = useContext(NglContext);
  const viewerAdapter = getViewerAdapter(VIEWS.MAJOR_VIEW);

  // If we are returning from a login redirect, restore the selections/visibility the user had
  // before logging in. The stored payload is read once on mount (it is keyed by target and only
  // ever written by capturePreviewStateForLogin when leaving a preview page to log in).
  const storedLoginStateRef = useRef(null);
  if (storedLoginStateRef.current === null) {
    storedLoginStateRef.current = currentTarget ? readStoredPreviewState(currentTarget) : null;
  }

  // Suppress the initial-load defaults as early as possible so they do not overwrite the restored
  // selection. initializeMolecules is guarded by !isSnapshot, so setting this flag here (before the
  // pose list mounts) prevents the "first alphabetical tag + first pose ligand" default view.
  useEffect(() => {
    if (storedLoginStateRef.current) {
      dispatch(setIsSnapshot(true));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply the stored state once the target's data has loaded, then clear the one-shot entry.
  useEffect(() => {
    if (storedLoginStateRef.current && lhsDataIsLoaded) {
      const stored = storedLoginStateRef.current;
      storedLoginStateRef.current = null;
      dispatch(restorePreviewStateFromLogin(stored)).then(savedOrientation => {
        clearStoredPreviewState(stored.target);
        // Apply the saved camera once the restored objects have had a chance to render, so we do
        // not fight the display hooks that center on load. Mirrors projectPreview's setOrientation.
        if (savedOrientation && savedOrientation.elements && viewerAdapter) {
          requestAnimationFrame(() => {
            try {
              viewerAdapter.setOrientation(savedOrientation.elements);
            } catch (e) {
              console.error('Failed to apply restored orientation', e);
            }
          });
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lhsDataIsLoaded]);

  useEffect(() => {
    let project = null;
    if (
      !currentPorject &&
      match &&
      match.params &&
      match.params[0] &&
      currentTarget &&
      targetList &&
      targetList.length > 0 &&
      projectsLoaded
    ) {
      const projectName = extractProjectFromURLParam(match.params[0]);
      if (!projectName) {
        const projectsForSelectedTarget = dispatch(getProjectsForSelectedTarget());
        if (projectsForSelectedTarget && projectsForSelectedTarget.length > 0) {
          if (projectsForSelectedTarget.length === 1) {
            dispatch(setCurrentProject(projectsForSelectedTarget[0]));
          } else {
            dispatch(setOpenPickProjectModal(true));
          }
        } else {
          //show message that there are no projects for this target
          history.push(URLS.landing);
        }
      } else {
        project = dispatch(getProjectForProjectName(projectName));
        dispatch(setCurrentProject(project));
      }
    }
  }, [dispatch, currentPorject, match, history, currentTarget, targetList, projectsLoaded]);

  useEffect(() => {
    // DJANGO_CONTEXT.target_warning_message = 'This is staging, please use <a href="https://fragalysis.diamond.ac.uk" target="_blank">production</a>';
    // DJANGO_CONTEXT.target_warning_message = 'This is staging, please use &lt;a href=&quot;https://fragalysis.diamond.ac.uk&quot; target=&quot;_blank&quot;&gt;production&lt;/a&gt;';
    if (DJANGO_CONTEXT.target_warning_message && DJANGO_CONTEXT.target_warning_message.length > 0) {
      // use textarea to decode html entities
      const textArea = document.createElement('textarea');
      textArea.innerHTML = DJANGO_CONTEXT.target_warning_message;
      // allow to display html in the warning message from the backend
      toastWarning(<div dangerouslySetInnerHTML={{ __html: textArea.value }} />);
    }
  }, [toastWarning]);

  return (
    <TooltipPathProvider path="preview">
      <Preview isStateLoaded={false} hideProjects={true} {...props} />
    </TooltipPathProvider>
  );
});
