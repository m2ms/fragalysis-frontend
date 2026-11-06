/**
 * Created by ricgillams on 28/06/2018.
 */

import React, { memo, useState, useContext } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from '../../common/Inputs/Button';
import { Settings, Mouse, PersonalVideo } from '@mui/icons-material';
import { ButtonGroup } from '@mui/material';
import { makeStyles } from '../../../ui/styles';
import { SettingControls } from './settingsControls';
import DisplayControls from './displayControls/';
import { MouseControls } from './mouseControls';
import { NglContext } from '../../nglView/nglProvider';
import { turnSide } from './redux/actions';
import RichTooltip from '../../tooltip/RichTooltip';
import { BackgroundColorToggle } from './BackgroundColorToggle';
import { LigandLoadingProgress } from './LigandLoadingProgress';

const drawers = {
  settings: 'settings',
  display: 'display',
  mouse: 'mouse'
};

const initDrawers = { [drawers.settings]: false, [drawers.display]: false, [drawers.mouse]: false };

const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing(),
    overflow: 'hidden'
  },
  button: {
    padding: theme.spacing()
  },
  sideControls: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(),
    flex: '1 1 0',
    minWidth: 0
  },
  rhsControls: {
    display: 'flex',
    justifyContent: 'flex-end',
    flex: '1 1 0',
    minWidth: 0
  },
  nglButtons: {
    flexShrink: 0,
    display: 'flex',
    justifyContent: 'center',
    flexWrap: 'nowrap',
    gap: theme.spacing(),
    position: 'relative'
  }
}));

export const ViewerControls = memo(() => {
  const [drawerSettings, setDrawerSettings] = useState(JSON.parse(JSON.stringify(initDrawers)));
  const classes = useStyles();
  const dispatch = useDispatch();

  const sidesOpen = useSelector(state => state.previewReducers.viewerControls.sidesOpen);

  const openDrawer = key => {
    //close all and open selected by key
    let newDrawerState = JSON.parse(JSON.stringify(initDrawers));
    newDrawerState[key] = !drawerSettings[key];
    setDrawerSettings(newDrawerState);
  };
  const closeAllDrawers = () => {
    setDrawerSettings(JSON.parse(JSON.stringify(initDrawers)));
  };

  return (
    <>
      <div className={classes.root}>
        <div className={classes.sideControls}>
          <RichTooltip path={sidesOpen.LHS ? 'lhs.close' : 'lhs.open'}>
            <Button
              id="open-lhs-button"
              variant={sidesOpen.LHS ? 'contained' : 'outlined'}
              size="small"
              color="primary"
              onClick={() => dispatch(turnSide('LHS', !sidesOpen.LHS))}
              className={classes.button}
            >
              Hits
            </Button>
          </RichTooltip>
          <LigandLoadingProgress />
        </div>

        <div className={classes.nglButtons}>
          <ButtonGroup variant="contained" color="primary">
            <RichTooltip path="settings">
              <Button
                size="small"
                aria-label="Viewer settings"
                color="primary"
                onClick={() => openDrawer(drawers.settings)}
                className={classes.button}
              >
                <Settings />
              </Button>
            </RichTooltip>
            <RichTooltip path="display">
              <Button
                size="small"
                aria-label="Display controls"
                color="primary"
                onClick={() => openDrawer(drawers.display)}
                className={classes.button}
              >
                <PersonalVideo />
              </Button>
            </RichTooltip>
            <RichTooltip path="mouse">
              <Button size="small" color="primary" onClick={() => openDrawer(drawers.mouse)} className={classes.button}>
                <Mouse />
              </Button>
            </RichTooltip>
          </ButtonGroup>
          <BackgroundColorToggle showLabel />
        </div>

        <div className={classes.rhsControls}>
          <RichTooltip path={sidesOpen.RHS ? 'rhs.close' : 'rhs.open'}>
            <Button
              variant={sidesOpen.RHS ? 'contained' : 'outlined'}
              size="small"
              color="primary"
              onClick={() => dispatch(turnSide('RHS', !sidesOpen.RHS))}
              className={classes.button}
            >
              Designs
            </Button>
          </RichTooltip>
        </div>
      </div>
      <SettingControls open={drawerSettings[drawers.settings]} onClose={closeAllDrawers} />
      <DisplayControls open={drawerSettings[drawers.display]} onClose={closeAllDrawers} />
      <MouseControls open={drawerSettings[drawers.mouse]} onClose={closeAllDrawers} />
    </>
  );
});
