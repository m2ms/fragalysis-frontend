/**
 * Created by abradley on 07/03/2018.
 */
import { hot, setConfig } from 'react-hot-loader';
import React, { memo } from 'react';
import 'typeface-roboto';
import Routes from './routes/Routes';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@material-ui/core/styles';
import { CssBaseline } from '@material-ui/core';
import { getTheme } from '../theme';
import { HeaderProvider } from './header/headerContext';
import { NglProvider } from './nglView/nglProvider';
import { ErrorBoundary } from './errorHandling/errorBoundary';

setConfig({
  reloadHooks: false
});

const Root = memo(() => (
  <CssBaseline>
    <ThemeProvider theme={getTheme()}>
      <HeaderProvider>
        <ErrorBoundary>
          <NglProvider>
            <BrowserRouter>
              <Routes />
            </BrowserRouter>
          </NglProvider>
        </ErrorBoundary>
      </HeaderProvider>
    </ThemeProvider>
  </CssBaseline>
));

export default hot(module)(Root);
