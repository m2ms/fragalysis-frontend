import React, { memo, useContext } from 'react';
import { Box, IconButton, makeStyles, Snackbar, useTheme } from '@material-ui/core';
import Header from '../header';
import { Route, Switch } from 'react-router-dom';
import TargetManagement from '../targetManagementHolder';
import Tindspect from '../Tindspect';
import Landing from '../landing/Landing';
import Preview from '../preview/Preview';
import Sessions from '../sessionHolder';
import Funders from '../fundersHolder';
import { withLoadingTargetList } from './withLoadingTargetIdList';
import { BrowserBomb } from '../browserBombModal';
import { URLS } from './constants';
import { HeaderContext } from '../header/headerContext';
import { Temp } from '../Temp';
import { Close } from '@material-ui/icons';

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
          <Route exact path="/viewer/react/targetmanagement" component={TargetManagement} />
          <Route exact path="/viewer/react/fraginpect" component={Tindspect} />
          <Route exact path="/viewer/react/landing" component={Landing} />
          <Route
            exact
            path="/viewer/react/preview/target/:target"
            render={routeProps => <Preview headerHeight={headerHeight} resetSelection {...routeProps} />}
          />
          <Route exact path="/viewer/react/sessions" component={Sessions} />
          <Route
            path={`${URLS.fragglebox}:uuid`}
            render={routeProps => <Preview headerHeight={headerHeight} isStateLoaded notCheckTarget {...routeProps} />}
          />
          <Route
            path={`${URLS.snapshot}:snapshotUuid`}
            render={routeProps => <Preview headerHeight={headerHeight} isStateLoaded notCheckTarget {...routeProps} />}
          />
          <Route exact path="/viewer/react/funders" component={Funders} />
          <Route exact path="/viewer/react/temp" component={Temp} />
        </Switch>
      </Box>
      <BrowserBomb />
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
