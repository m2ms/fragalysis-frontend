import React, { memo, useContext } from 'react';
import { Box, IconButton, makeStyles, Snackbar, useTheme } from '@material-ui/core';
import Header from '../header';
import { Route, Switch } from 'react-router-dom';
import { Management } from '../management/management';
import Tindspect from '../tindspect/Tindspect';
import Landing from '../landing/Landing';
import Preview from '../preview/Preview';
import Funders from '../funders/fundersHolder';
import { withLoadingTargetList } from '../target/withLoadingTargetIdList';
import { BrowserCheck } from '../errorHandling/browserCheck';
import { URLS } from './constants';
import { HeaderContext } from '../header/headerContext';
import { Close } from '@material-ui/icons';
import SessionList from '../session/sessionList';
import { ProjectsOld } from '../projectOld';
import { ProjectDetailOld } from '../projectOld/projectDetailOld';
import { Projects } from '../projects';
import { ProjectDetailSessionList } from '../projects/projectDetailSessionList';
import { ProjectDetailDrawer } from '../projects/projectDetailDrawer';

const useStyles = makeStyles(theme => ({
  content: {
    backgroundColor: theme.palette.background.default,
    padding: theme.spacing(1)
  }
}));

const Routes = memo(() => {
  const classes = useStyles();
  const theme = useTheme();
  const { headerHeight, setHeaderHeight, snackBarTitle, setSnackBarTitle } = useContext(HeaderContext);
  const contentHeight = `calc(100vh - ${headerHeight}px - ${2 * theme.spacing(1)}px)`;
  const contentWidth = `100%`;

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackBarTitle(null);
  };

  return (
    <Box minHeight="100vh" width="100%" margin={0}>
      <Header headerHeight={headerHeight} setHeaderHeight={setHeaderHeight} />
      <Box className={classes.content} minHeight={contentHeight} width={contentWidth}>
        <Switch>
          <Route exact path={URLS.projectsOld} component={ProjectsOld} />
          <Route exact path={`${URLS.projectsOld}:projectId`} component={ProjectDetailOld} />
          {/* Old projects mock-ups */}
          <Route exact path={URLS.projects} component={Projects} />
          <Route
            exact
            path={`${URLS.projects}:projectId`}
            render={routeProps => <ProjectDetailDrawer headerHeight={headerHeight} resetSelection {...routeProps} />}
          />
          <Route exact path={`${URLS.projects}:projectId/history`} component={ProjectDetailSessionList} />
          <Route exact path={URLS.management} component={Management} />
          <Route exact path="/viewer/react/fraginpect" component={Tindspect} />
          <Route exact path={URLS.landing} component={Landing} />
          <Route
            exact
            path={`${URLS.target}:target`}
            render={routeProps => <Preview headerHeight={headerHeight} resetSelection {...routeProps} />}
          />
          <Route exact path={URLS.sessions} component={SessionList} />
          <Route
            path={`${URLS.fragglebox}:uuid`}
            render={routeProps => <Preview headerHeight={headerHeight} isStateLoaded notCheckTarget {...routeProps} />}
          />
          <Route
            path={`${URLS.snapshot}:snapshotUuid`}
            render={routeProps => <Preview headerHeight={headerHeight} isStateLoaded notCheckTarget {...routeProps} />}
          />
          <Route exact path={URLS.funders} component={Funders} />
        </Switch>
      </Box>
      <BrowserCheck />
      {/* SnackBar is populated by Header Provider */}
      <Snackbar
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right'
        }}
        open={snackBarTitle !== null}
        onClose={handleCloseSnackbar}
        ContentProps={{
          'aria-describedby': 'message-id'
        }}
        message={<span id="message-id">{snackBarTitle}</span>}
        action={[
          <IconButton key="close" aria-label="close" color="inherit" onClick={handleCloseSnackbar}>
            <Close />
          </IconButton>
        ]}
      />
    </Box>
  );
});

export default withLoadingTargetList(Routes);
