import React, { memo, useContext, useEffect, useRef, useState } from 'react';
import { Panel } from '../../common/Surfaces/Panel';
import { templateExtend, TemplateName, Orientation, Gitgraph } from '@gitgraph/react';
import { MergeType, PlayArrow } from '@material-ui/icons';
import { makeStyles } from '@material-ui/core';
import { Button } from '../../common/Inputs/Button';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory, useRouteMatch } from 'react-router-dom';
import { loadSnapshotTree } from '../../projects/redux/dispatchActions';
import palette from '../../../theme/palette';
import { ModalShareSnapshot } from '../../snapshot/modals/modalShareSnapshot';
import { setIsOpenModalBeforeExit, setSelectedSnapshotToSwitch } from '../../snapshot/redux/actions';
import { NglContext } from '../../nglView/nglProvider';
import JobPopup from './JobPopup';
import JobLauncherPopup from './JobLauncherPopup';

export const heightOfProjectHistory = '164px';

const useStyles = makeStyles(theme => ({
  root: {
    marginTop: theme.spacing()
  },
  containerExpanded: {
    width: '100%',
    height: heightOfProjectHistory,
    overflow: 'auto'
  },
  containerCollapsed: {
    height: 0
  },
  nglViewItem: {
    paddingLeft: theme.spacing(1) / 2
  },
  checklistItem: {
    height: '100%'
  }
}));

const template = templateExtend(TemplateName.Metro, {
  branch: {
    lineWidth: 3,
    spacing: 20,
    label: {
      font: 'normal 8pt Arial',
      pointerWidth: 100,
      display: false
    }
  },
  commit: {
    message: {
      displayHash: false,
      font: 'normal 10pt Arial',
      displayAuthor: false,
      display: false
    },
    spacing: 30,
    dot: {
      size: 8
    }
  },

  tag: {
    font: 'normal 8pt Arial',
    color: palette.primary.main
    //bgColor: palette.primary.main
  }
});

const options = {
  template,
  orientation: Orientation.Horizontal
};

export const ProjectHistory = memo(({ showFullHistory }) => {
  const classes = useStyles();
  const ref = useRef(null);
  let history = useHistory();
  const { nglViewList } = useContext(NglContext);
  const dispatch = useDispatch();
  let match = useRouteMatch();
  const projectID = useSelector(state => state.projectReducers.currentProject).projectID;
  const snapshotId = useSelector(state => state.projectReducers.currentSnapshot).id;
  const currentSnapshotID = useSelector(state => state.projectReducers.currentSnapshot.id);
  const currentSnapshotList = useSelector(state => state.projectReducers.currentSnapshotList);
  const currentSnapshotJobList = useSelector(state => state.projectReducers.currentSnapshotJobList);
  const currentSnapshotTree = useSelector(state => state.projectReducers.currentSnapshotTree);
  const isLoadingTree = useSelector(state => state.projectReducers.isLoadingTree);

  const [jobPopupInfo, setJobPopupInfo] = useState({
    hash: null,
    jobInfo: null
  });

  const [jobLauncherPopUpAnchorEl, setJobLauncherPopUpAnchorEl] = useState(null);

  const handleClickJobLauncher = event => {
    setJobLauncherPopUpAnchorEl(event.currentTarget);
  };

  const handleClickOnCommit = commit => {
    dispatch(setSelectedSnapshotToSwitch(commit.hash));
    dispatch(setIsOpenModalBeforeExit(true));
  };

  const commitFunction = ({ title, hash, isSelected = false }) => ({
    hash: `${hash}`,
    subject: `${title}`,
    onMessageClick: handleClickOnCommit,
    onClick: handleClickOnCommit,
    style:
      (isSelected === true && { dot: { size: 10, color: 'red', strokeColor: 'blue', strokeWidth: 2 } }) || undefined
  });

  const [jobPopUpAnchorEl, setJobPopUpAnchorEl] = useState(null);

  const handleClickTriangle = (event, hash, jobInfo) => {
    setJobPopUpAnchorEl(event.currentTarget);
    setJobPopupInfo({ hash, jobInfo });
  };

  const commitJobFunction = ({ title, hash, customDot = null }) => ({
    hash: `${hash}`,
    subject: `${title}`,
    renderDot: customDot !== null && customDot
  });

  const renderTriangle = (fill, commit, jobInfo) => () => {
    return React.createElement(
      'svg',
      {
        xmlns: 'http://www.w3.org/2000/svg',
        viewBox: '0 0 71.84 75.33',
        height: '30',
        width: '30',
        cursor: 'pointer',
        onClick: event => handleClickTriangle(event, commit, jobInfo),
        onMessageClick: event => handleClickTriangle(event, commit, jobInfo)
      },
      React.createElement(
        'g',
        { fill, stroke: '#DDDDDD', strokeWidth: '4' },
        React.createElement('path', {
          d: 'M 25,0 49,49.5 0,49.5 z'
        })
      ),
      React.createElement(
        'g',
        { fill: '#B7B7B7', stroke: '#BECEBE', strokeWidth: '0' },
        React.createElement('path', {
          d: 'M 25,0 49,49.5 25,35 z'
        })
      )
    );
  };

  const renderTreeNode = (childID, gitgraph, parentBranch) => {
    const node = currentSnapshotList[childID];
    if (node !== undefined) {
      const newBranch = gitgraph.branch({
        name: node.title,
        from: parentBranch
      });

      const newCommit = newBranch.commit(
        commitFunction({
          title: node.title || '',
          hash: node.id,
          isSelected: currentSnapshotID === node.id
        })
      );

      currentSnapshotJobList[node.id].forEach(job => {
        newBranch.commit(
          commitJobFunction({
            title: job.id,
            hash: job.id,
            customDot: renderTriangle('#D5E8D4', node.id, job)
          })
        );
      });

      /*
      newBranch.commit(
        commitJobFunction({
          title: Math.floor(Math.random() * 1000),
          hash: Math.floor(Math.random() * 1000),
          customDot: renderTriangle('#D5E8D4', node.id, jobInfo)
        })
      );
      newBranch.commit(
        commitJobFunction({
          title: Math.floor(Math.random() * 1000),
          hash: Math.floor(Math.random() * 1000),
          customDot: renderTriangle('#F9D5D3', node.id, jobInfo)
        })
      );
      newBranch.commit(
        commitJobFunction({
          title: Math.floor(Math.random() * 1000),
          hash: Math.floor(Math.random() * 1000),
          customDot: renderTriangle('#FFF2CC', node.id, jobInfo)
        })
      );
      newBranch.commit(
        commitJobFunction({
          title: Math.floor(Math.random() * 1000),
          hash: Math.floor(Math.random() * 1000),
          customDot: renderTriangle('#FFF2CC', node.id, jobInfo)
        })
      );*/

      node.children.forEach(childID => {
        renderTreeNode(childID, gitgraph, newBranch);
      });
    }
  };

  useEffect(() => {
    if (currentSnapshotID !== null) {
      dispatch(loadSnapshotTree(projectID)).catch(error => {
        throw new Error(error);
      });
    }
  }, [currentSnapshotID, dispatch, projectID, snapshotId]);

  return (
    <div className={classes.root}>
      <Panel
        ref={ref}
        hasHeader
        title="Project History"
        headerActions={[
          <Button
            color="inherit"
            variant="text"
            size="small"
            onClick={handleClickJobLauncher}
            startIcon={<PlayArrow />}
          >
            Job Launcher
          </Button>,
          <Button color="inherit" variant="text" size="small" onClick={showFullHistory} startIcon={<MergeType />}>
            Detail
          </Button>
        ]}
        hasExpansion
        defaultExpanded
      >
        <div className={classes.containerExpanded}>
          {isLoadingTree === false &&
            currentSnapshotTree !== null &&
            currentSnapshotTree.children !== null &&
            currentSnapshotTree.title !== null &&
            currentSnapshotTree.id !== null &&
            currentSnapshotID !== null &&
            currentSnapshotList !== null && (
              <Gitgraph options={options}>
                {gitgraph => {
                  const initBranch = gitgraph.branch(currentSnapshotTree.title);

                  initBranch.commit(
                    commitFunction({
                      title: currentSnapshotTree.title || '',
                      hash: currentSnapshotTree.id,
                      isSelected: currentSnapshotID === currentSnapshotTree.id
                    })
                  );

                  currentSnapshotTree.children.forEach(childID => {
                    renderTreeNode(childID, gitgraph, initBranch);
                  });
                }}
              </Gitgraph>
            )}

          <JobPopup
            jobPopUpAnchorEl={jobPopUpAnchorEl}
            setJobPopUpAnchorEl={setJobPopUpAnchorEl}
            jobPopupInfo={jobPopupInfo}
          />
          <JobLauncherPopup
            jobLauncherPopUpAnchorEl={jobLauncherPopUpAnchorEl}
            setJobLauncherPopUpAnchorEl={setJobLauncherPopUpAnchorEl}
            snapshots={currentSnapshotList}
          />
        </div>
      </Panel>
    </div>
  );
});
