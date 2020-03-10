import 'babel-polyfill';
import React from 'react';
import { render } from 'react-dom';
import Root from './components/root';
import { DJANGO_CONTEXT } from './utils/djangoContext';
// Sentry logging
import { init } from '@sentry/browser';
// Setup log rocket logging
import LogRocket from 'logrocket';
import { ErrorBoundary } from './components/errorHandling/errorBoundary';
LogRocket.init('eoalzb/fragalysis');
// This is the log rocket setup

LogRocket.identify(DJANGO_CONTEXT['username'], {
  pk: DJANGO_CONTEXT['pk'],
  name: DJANGO_CONTEXT['name'],
  email: DJANGO_CONTEXT['email']
});

init({
  dsn: 'https://27fa0675f555431aa02ca552e93d8cfb@sentry.io/1298290'
});

const doc = document;
doc.body.style.margin = '0px';

doc.head.querySelector('link').remove();

  render(
    <ErrorBoundary>
      <Root />
    </ErrorBoundary>,
    doc.getElementById('app')
  );
