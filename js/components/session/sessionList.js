/**
 * Created by ricgillams on 29/10/2018.
 */

import { ListGroupItem, ListGroup, Row, Col, ButtonToolbar } from 'react-bootstrap';
import React, { Fragment, memo, useEffect, useRef } from 'react';
import { connect } from 'react-redux';
import * as apiActions from '../../reducers/api/apiActions';
import * as listType from '../listTypes';
import { withRouter, Link } from 'react-router-dom';
import { getUrl, loadFromServer } from '../../utils/genericList';
import { CircularProgress, makeStyles } from '@material-ui/core';
import { updateClipboard } from './helpers';
import { Button } from '../common/inputs/button';

const useStyles = makeStyles(theme => ({
  loader: {
    display: 'block',
    margin: '0 auto',
    borderCcolor: 'red'
  }
}));

const SessionList = memo(
  ({
    sessionIdList,
    seshListSaving,
    setSessionIdList,
    updateSessionIdList,
    setSeshListSaving,
    setErrorMessage,
    location
  }) => {
    const list_type = listType.SESSIONS;
    const oldUrl = useRef('');
    const setOldUrl = url => {
      oldUrl.current = url;
    };
    const { pathname } = location;
    const classes = useStyles();

    const getCookie = name => {
      if (!document.cookie) {
        return null;
      }
      const xsrfCookies = document.cookie
        .split(';')
        .map(c => c.trim())
        .filter(c => c.startsWith(name + '='));
      if (xsrfCookies.length === 0) {
        return null;
      }
      return decodeURIComponent(xsrfCookies[0].split('=')[1]);
    };

    const renameStateSession = (id, title) => {
      let currentSessionList = sessionIdList;
      currentSessionList.forEach(session => {
        if (currentSessionList[session].id === id) {
          Object.assign(currentSessionList[session], { title: title });
        }
      });
      updateSessionIdList(currentSessionList);
    };

    const handleSessionNaming = e => {
      if (e.keyCode === 13) {
        const id = e.target.id;
        const title = e.target.value;
        renameStateSession(id, title);
        const csrfToken = getCookie('csrftoken');
        const formattedState = {
          id,
          title
        };
        fetch('/api/viewscene/' + id, {
          method: 'PATCH',
          headers: {
            'X-CSRFToken': csrfToken,
            Accept: 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formattedState)
        }).catch(error => {
          setErrorMessage(error);
        });
      }
    };

    const deleteStateSession = id => {
      let currentSessionList = sessionIdList;
      currentSessionList.forEach(session => {
        if (currentSessionList[session].id === id) {
          currentSessionList.splice(session, 1);
        }
      });
      updateSessionIdList(currentSessionList);
      if (sessionIdList.length === 23) {
        setSeshListSaving(true);
        window.location.reload();
      }
    };

    const deleteSession = id => {
      deleteStateSession(id);
      const csrfToken = getCookie('csrftoken');
      var sceneUrl = '/api/viewscene/' + id;
      fetch(sceneUrl, {
        method: 'delete',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken
        }
      });
    };

    const renderDeleteButton = data => (
      <button
        onClick={function onClick() {
          deleteSession(data.id);
        }}
      >
        Delete
      </button>
    );

    const renderCopyUrlButton = data => {
      const urlToCopy =
        window.location.protocol + '//' + window.location.hostname + '/viewer/react/fragglebox/' + data.uuid;
      return <Button onClick={() => updateClipboard(urlToCopy)}>Copy link</Button>;
    };

    const render_method = data => {
      var fragglebox = '/viewer/react/fragglebox/' + data.uuid;
      if (pathname === '/viewer/react/sessions') {
        return (
          <ListGroupItem key={data.id}>
            <Row>
              <Col xs={3} md={3}>
                <Row />
                <p />
                <Row>
                  <p>
                    Title:{' '}
                    <Link to={fragglebox}>{sessionIdList[sessionIdList.findIndex(x => x.id === data.id)].title}</Link>
                  </p>
                </Row>
              </Col>
              <Col xs={3} md={3}>
                <Row />
                <p />
                <Row>
                  <p>
                    Last modified on {data.modified.slice(0, 10)} at {data.modified.slice(11, 19)}
                  </p>
                </Row>
              </Col>
              <Col xs={1} md={1}>
                <Row />
                <p />
                <Row>
                  <p>Target: {data.target_on_name}</p>
                </Row>
              </Col>
              <Col xs={3} md={3}>
                <input
                  id={data.id}
                  key="sessRnm"
                  style={{ width: 250 }}
                  defaultValue={data.title}
                  onKeyDown={handleSessionNaming}
                />
                <sup>
                  <br />
                  To rename, type new title & press enter.
                </sup>
              </Col>
              <Col xs={2} md={2}>
                <ButtonToolbar>
                  {renderCopyUrlButton(data)} {renderDeleteButton(data)}
                </ButtonToolbar>
              </Col>
            </Row>
          </ListGroupItem>
        );
      } else {
        return (
          <ListGroupItem key={data.id}>
            <Row>
              <Col xs={12} sm={12} md={6} lgOffset={1} lg={7}>
                <Row />
                <p />
                <Row>
                  <p>
                    Title: <Link to={fragglebox}>{data.title}</Link>
                  </p>
                </Row>
              </Col>
              <Col xsHidden smHidden md={6} lg={4}>
                <Row />
                <p />
                <Row>
                  <p>Target: {data.target_on_name}</p>
                </Row>
              </Col>
            </Row>
          </ListGroupItem>
        );
      }
    };

    useEffect(() => {
      loadFromServer({
        url: getUrl({ list_type, setSeshListSaving }),
        setOldUrl: url => setOldUrl(url),
        old_url: oldUrl.current,
        list_type,
        setObjectList: setSessionIdList,
        seshListSaving
      }).catch(error => {
        setErrorMessage(error);
      });
    }, [list_type, setSessionIdList, setSeshListSaving, seshListSaving, setErrorMessage]);

    let sessionListTitle;
    if ((sessionIdList.length !== 0 && sessionIdList.length <= 10) || pathname !== '/viewer/react/sessions') {
      sessionListTitle = <h3>Session List:</h3>;
    } else if (sessionIdList.length > 10) {
      sessionListTitle = (
        <h3>
          You have {sessionIdList.length} sessions. Please consider deleting old/unused{' '}
          <a href="/viewer/react/sessions">sessions</a> to improve performance.
        </h3>
      );
    }

    if (seshListSaving === true) {
      return (
        <Fragment>
          {sessionListTitle}
          <CircularProgress />
        </Fragment>
      );
    } else {
      if (sessionIdList) {
        // eslint-disable-next-line no-undef
        if (DJANGO_CONTEXT['username'] === 'NOT_LOGGED_IN') {
          return <h3>Please log in to view session history.</h3>;
        } else if (sessionIdList.length === 0) {
          return (
            <div>
              <h3>You do not own any sessions!</h3>
              <p>Proceed to a target to generate sessions.</p>
            </div>
          );
        } else {
          if (pathname !== '/viewer/react/sessions') {
            return (
              <div>
                {sessionListTitle}
                <ListGroup>{sessionIdList.slice(0, 10).map(data => render_method(data))}</ListGroup>
                <p>
                  Full list and session management here: <a href="/viewer/react/sessions">Sessions</a>
                </p>
              </div>
            );
          } else {
            return (
              <div>
                {sessionListTitle}
                <ListGroup>{sessionIdList.map(data => render_method(data))}</ListGroup>
              </div>
            );
          }
        }
      } else {
        return null;
      }
    }
  }
);
function mapStateToProps(state) {
  return {
    sessionIdList: state.apiReducers.present.sessionIdList,
    seshListSaving: state.apiReducers.present.seshListSaving
  };
}

const mapDispatchToProps = {
  setSessionIdList: apiActions.setSessionIdList,
  updateSessionIdList: apiActions.updateSessionIdList,
  setSeshListSaving: apiActions.setSeshListSaving,
  setErrorMessage: apiActions.setErrorMessage
};

export default withRouter(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )(SessionList)
);
