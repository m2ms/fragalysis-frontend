/**
 * Created by abradley on 01/03/2018.
 */

import { Stage } from 'ngl';
import React, { memo, useEffect, useCallback, useContext, useState } from 'react';
import { connect } from 'react-redux';
import * as nglActions from '../../reducers/ngl/actions';
import * as nglDispatchActions from '../../reducers/ngl/dispatchActions';
import * as selectionActions from '../../reducers/selection/actions';
import { NglContext } from './nglProvider';
import { handleNglViewPick } from './redux/dispatchActions';
import { throttle } from 'lodash';
import { BACKGROUND_COLOR, NGL_PARAMS } from './constants';
import { makeStyles, useTheme } from '@material-ui/core';
import { VIEWS } from '../../constants/constants';
import { HeaderContext } from '../header/headerContext';

const useStyles = makeStyles(theme => ({
  paper: {
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.spacing(1) / 2,
    boxShadow: [
      '0px 2px 1px -1px rgba(0,0,0,0.2)',
      '0px 1px 1px 0px rgba(0,0,0,0.14)',
      '0px 1px 3px 0px rgba(0,0,0,0.12)'
    ],
    marginBottom: theme.spacing(1)
  }
}));

const NglView = memo(({ div_id, height, setOrientation, removeAllNglComponents, handleNglViewPick }) => {
  // connect to NGL Stage object
  const { registerNglView, unregisterNglView, getNglView } = useContext(NglContext);
  const { setError } = useContext(HeaderContext);
  const [stage, setStage] = useState();
  const classes = useStyles();
  const theme = useTheme();

  const handleOrientationChanged = useCallback(
    throttle(() => {
      const newStage = getNglView(div_id);
      if (newStage) {
        const currentOrientation = newStage.stage.viewerControls.getOrientation();
        setOrientation(div_id, currentOrientation);
      }
    }, 250),
    [div_id, getNglView, setOrientation]
  );

  // Initialization of NGL View component
  const handleResize = useCallback(() => {
    const newStage = getNglView(div_id);
    if (newStage) {
      newStage.stage.handleResize();
    }
  }, [div_id, getNglView]);

  const registerStageEvents = useCallback(
    (newStage, getNglView) => {
      if (newStage) {
        window.addEventListener('resize', handleResize);
        newStage.mouseControls.add('clickPick-left', (st, pickingProxy) =>
          handleNglViewPick(st, pickingProxy, getNglView, setError)
        );

        newStage.mouseObserver.signals.scrolled.add(handleOrientationChanged);
        newStage.mouseObserver.signals.dropped.add(handleOrientationChanged);
        newStage.mouseObserver.signals.dragged.add(handleOrientationChanged);
      }
    },
    [handleResize, handleOrientationChanged, handleNglViewPick, setError]
  );

  const unregisterStageEvents = useCallback(
    (newStage, getNglView) => {
      if (newStage) {
        window.addEventListener('resize', handleResize);
        window.removeEventListener('resize', handleResize);
        newStage.mouseControls.remove('clickPick-left', (st, pickingProxy) =>
          handleNglViewPick(st, pickingProxy, getNglView, setError)
        );
        newStage.mouseObserver.signals.scrolled.remove(handleOrientationChanged);
        newStage.mouseObserver.signals.dropped.remove(handleOrientationChanged);
        newStage.mouseObserver.signals.dragged.remove(handleOrientationChanged);
      }
    },
    [handleResize, handleOrientationChanged, handleNglViewPick, setError]
  );

  useEffect(() => {
    const nglViewFromContext = getNglView(div_id);
    if (stage === undefined && !nglViewFromContext) {
      const newStage = new Stage(div_id);
      newStage.setParameters({ [NGL_PARAMS.backgroundColor]: BACKGROUND_COLOR.white });
      registerNglView(div_id, newStage);
      registerStageEvents(newStage, getNglView);
      setStage(newStage);
    } else if (stage === undefined && nglViewFromContext && nglViewFromContext.stage) {
      registerStageEvents(nglViewFromContext.stage, getNglView);
      setStage(nglViewFromContext.stage);
    } else if (stage) {
      registerStageEvents(stage, getNglView);
    }

    return () => {
      if (stage) {
        unregisterStageEvents(stage, getNglView);
        unregisterNglView(div_id);
      }
    };
  }, [
    div_id,
    handleResize,
    registerNglView,
    unregisterNglView,
    handleOrientationChanged,
    removeAllNglComponents,
    registerStageEvents,
    unregisterStageEvents,
    stage,
    getNglView
  ]);
  // End of Initialization NGL View component

  return (
    <div
      id={div_id}
      className={div_id === VIEWS.MAJOR_VIEW ? classes.paper : {}}
      style={{
        height: `calc(${height || '600px'} - ${theme.spacing(1)}px)`
      }}
    />
  );
});

function mapStateToProps(state) {
  return {};
}
const mapDispatchToProps = {
  setMolGroupSelection: selectionActions.setMolGroupSelection,
  setOrientation: nglDispatchActions.setOrientation,
  removeAllNglComponents: nglActions.removeAllNglComponents,
  handleNglViewPick
};

NglView.displayName = 'NglView';

export default connect(mapStateToProps, mapDispatchToProps)(NglView);
