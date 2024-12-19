import React, { memo, useEffect } from 'react';
import { useHistory, useRouteMatch } from 'react-router-dom';
import Preview from '../preview/Preview';
import { URL_TOKENS } from './constants';
import { useDispatch, useSelector } from 'react-redux';
import { setDirectAccess, setTargetOn, setDirectAccessProcessed } from '../../reducers/api/actions';
import { loadTargetList } from '../target/redux/dispatchActions';
import { setCurrentProject, setOpenPickProjectModal } from '../target/redux/actions';
import { getProjectForProjectName, getProjectsForTargetDisp } from '../preview/redux/dispatchActions';
import { URLS } from '../routes/constants';

export const DirectDisplay = memo(props => {
  let match = useRouteMatch();
  const dispatch = useDispatch();
  let history = useHistory();

  const targetIdList = useSelector(state => state.apiReducers.target_id_list);
  const directDisplay = useSelector(state => state.apiReducers.direct_access);
  const directAccessProcessed = useSelector(state => state.apiReducers.direct_access_processed);
  const projects = useSelector(state => state.targetReducers.projects);
  const projectsLoaded = useSelector(state => state.targetReducers.projectsLoaded);
  const all_data_loaded = useSelector(state => state.apiReducers.all_data_loaded);

  useEffect(() => {
    let onCancel = () => {};
    dispatch(loadTargetList(onCancel)).catch(error => {
      throw new Error(error);
    });
    return () => {
      onCancel();
    };
  }, [dispatch]);

  useEffect(() => {
    // example url http://127.0.0.1:8080/viewer/react/preview/direct/target/MID2A/tas/lb00000/mols/X0301_0A/L/P/S/X0393_0B/L/P
    // example url with 'exact' https://fragalysis-tibor-default.xchem-dev.diamond.ac.uk/viewer/react/preview/direct/target/NUDT7A_CRUDE/mols/NUDT7A_CRUDE-X0156_1/exact/L/P
    // in two cases above we are searching for molecules using shortcode
    // Now the search term is looked up in the `shortcode`, `compound ID` and all of the `aliases` (I can change this pretty quickly)
    // `http://127.0.0.1:8080/viewer/react/preview/direct/target/A71EV2A/tas/lb18145-1/compound/7516/L/S/nonsense-45/L/P/exact/Z4/L/C/A0853a/L/P`
    // URL above shows `L` and `S` for observation which contains substring `7516`, `L` and `P` for observation which exactly has string `nonsense-45` as a shortcode,
    // compound ID or one of the aliases, `L` and `C` for all observations which contain substring `Z4`, and `L` and `P` for observations which contains substring `A0853a`
    const param = match.params[0];
    if (!directAccessProcessed && param && param.startsWith(URL_TOKENS.target)) {
      let withoutKeyword = param.split(URL_TOKENS.target);
      if (withoutKeyword && withoutKeyword.length === 2) {
        const splitParams = withoutKeyword[1].split('/');
        if (splitParams && splitParams.length > 1) {
          let target = splitParams[1];
          let rest = splitParams.slice(2);
          let molecules = [];
          if (rest && rest.length > 1 && rest[0] === URL_TOKENS.target_access_string) {
            rest = rest.slice(1);
            const tas = rest[0];
            rest = rest.slice(1);

            const currentProject = projects && tas && dispatch(getProjectForProjectName(tas));
            currentProject && dispatch(setCurrentProject(currentProject));
          } else {
            const projectsForTarget = target && dispatch(getProjectsForTargetDisp(target));
            if (projectsForTarget && projectsForTarget.length === 1) {
              dispatch(setCurrentProject(projectsForTarget[0]));
            } else if (projectsForTarget && projectsForTarget.length > 1) {
              dispatch(setOpenPickProjectModal(true));
            } else {
              if (projectsLoaded && all_data_loaded) {
                history.push(URLS.landing);
              }
            }
          }
          if (rest && rest.length > 1 && (rest[0] === URL_TOKENS.molecules || rest[0] === URL_TOKENS.compound)) {
            let searchSettings = { searchBy: {} };
            if (rest[0] === URL_TOKENS.molecules) {
              searchSettings = { searchBy: { shortcode: true, aliases: false, compoundId: false } };
            } else if (rest[0] === URL_TOKENS.compound) {
              searchSettings = { searchBy: { shortcode: true, aliases: true, compoundId: true } };
            }
            rest = rest.slice(1);
            let i;
            let currentMolecule;
            for (i = 0; i < rest.length; i++) {
              const part = rest[i];
              if (part && part.trim()) {
                if (currentMolecule) {
                  switch (part || part.toUpperCase()) {
                    case 'A':
                      currentMolecule.L = true;
                      currentMolecule.P = true;
                      currentMolecule.C = true;
                      currentMolecule.S = true;
                      currentMolecule.V = true;
                      break;
                    case 'L':
                      currentMolecule.L = true;
                      break;
                    case 'P':
                      currentMolecule.P = true;
                      break;
                    case 'C':
                      currentMolecule.C = true;
                      break;
                    case 'S':
                      currentMolecule.S = true;
                      break;
                    case 'V':
                      currentMolecule.V = true;
                      break;
                    default:
                      if (part.toLowerCase() === URL_TOKENS.exact) {
                        currentMolecule.exact = true;
                      } else {
                        currentMolecule = {
                          name: part,
                          L: true,
                          P: false,
                          C: false,
                          S: false,
                          V: false,
                          exact: false,
                          searchSettings: searchSettings
                        };
                        molecules.push(currentMolecule);
                      }
                      break;
                  }
                } else {
                  currentMolecule = {
                    name: part,
                    L: true,
                    P: false,
                    C: false,
                    S: false,
                    V: false,
                    exact: false,
                    searchSettings: searchSettings
                  };
                  molecules.push(currentMolecule);
                }
              } else {
                continue;
              }
            }

            dispatch(setDirectAccess({ target: target, molecules: molecules }));
          }
        }
      }
    }
  }, [match, dispatch, directAccessProcessed, projects, history, projectsLoaded, all_data_loaded]);

  useEffect(() => {
    if (targetIdList.length && directDisplay) {
      let targetId = -1;
      targetIdList.forEach(t => {
        if (t.title === directDisplay.target) {
          targetId = t.id;
        }
      });
      if (targetId > 0) {
        dispatch(setTargetOn(targetId));
      }
    }
  }, [targetIdList, directDisplay, dispatch]);

  return <Preview isStateLoaded={false} hideProjects={true} />;
});
