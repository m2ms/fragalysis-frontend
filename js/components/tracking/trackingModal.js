import React, { memo, useContext, useCallback, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Modal from '../common/Modal';
import { Grid, makeStyles, IconButton, Tooltip } from '@material-ui/core';
import { Timeline, TimelineEvent } from 'react-event-timeline';
import { Check, Clear, Save, Restore, Close } from '@material-ui/icons';
import palette from '../../theme/palette';
import { Panel } from '../common';
import {
  selectCurrentActionsList,
  restoreCurrentActionsList,
  setProjectTruckingActions
} from '../../reducers/tracking/dispatchActions';
import { NglContext } from '../nglView/nglProvider';

const useStyles = makeStyles(theme => ({
  customModal: {
    width: '70%',
    height: '90%'
  },
  customContentModal: {
    height: '100%'
  },
  timelineEvent: {
    borderBottom: '1px dashed ' + palette.divider,
    paddingBottom: '10px'
  },
  divContainer: {
    height: '100%',
    width: '100%',
    paddingTop: theme.spacing(1) / 2
  },
  divScrollable: {
    height: '100%',
    width: '100%',
    overflow: 'auto'
  },
  containerExpanded: { height: '100%' }
}));

export const TrackingModal = memo(({ openModal, onModalClose }) => {
  const classes = useStyles();
  const dispatch = useDispatch();
  const { nglViewList } = useContext(NglContext);

  const actionList = useSelector(state => state.trackingReducers.project_actions_list);
  const orderedActionList = (actionList && actionList.sort((a, b) => a.timestamp - b.timestamp)) || [];

  const loadAllActions = useCallback(() => {
    if (openModal === true) {
      dispatch(setProjectTruckingActions());
    }
  }, [dispatch, openModal]);

  useEffect(() => {
    loadAllActions();
  }, [loadAllActions]);

  if (openModal === undefined) {
    console.log('undefined openModal');
    onModalClose();
  }

  const actions = [
    <IconButton color={'inherit'} onClick={() => dispatch(selectCurrentActionsList())}>
      <Tooltip title="Save">
        <Save />
      </Tooltip>
    </IconButton>,
    <IconButton color={'inherit'} onClick={() => dispatch(restoreCurrentActionsList(nglViewList))}>
      <Tooltip title="Restore">
        <Restore />
      </Tooltip>
    </IconButton>,
    <IconButton color={'inherit'} onClick={() => onModalClose()}>
      <Tooltip title="Close">
        <Close />
      </Tooltip>
    </IconButton>
  ];

  return (
    <Modal
      otherClasses={classes.customModal}
      otherContentClasses={classes.customContentModal}
      open={openModal}
      onClose={() => onModalClose()}
    >
      <Panel bodyOverflow={true} hasHeader={true} title="Action List" headerActions={actions}>
        <Grid container justify="space-between" className={classes.containerExpanded}>
          <div className={classes.divContainer}>
            <div className={classes.divScrollable}>
              <Timeline>
                {orderedActionList &&
                  orderedActionList.map((data, index) => {
                    if (data && data != null) {
                      return (
                        <TimelineEvent
                          key={index}
                          title={data.text}
                          createdAt={new Date(data.timestamp).toLocaleString()}
                          icon={
                            data.type.includes('OFF') === true ||
                            data.type.includes('DESELECTED') === true ||
                            data.type.includes('REMOVED') === true ? (
                              <Clear />
                            ) : (
                              <Check />
                            )
                          }
                          iconColor={palette.primary.main}
                          className={classes.timelineEvent}
                        ></TimelineEvent>
                      );
                    }
                  })}
              </Timeline>
            </div>
          </div>
        </Grid>
      </Panel>
    </Modal>
  );
});