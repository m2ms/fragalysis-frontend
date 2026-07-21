/**
 * Created by ricgillams on 21/06/2018.
 */
import { GridLegacy as Grid, Link } from '@mui/material';
import { makeStyles } from '../../ui/styles';
import React, { memo, useCallback, useContext, useEffect, useState } from 'react';
import { TargetList } from '../target/targetList';
import { connect, useDispatch, useSelector } from 'react-redux';
import * as apiActions from '../../reducers/api/actions';
import * as selectionActions from '../../reducers/selection/actions';
import { DJANGO_CONTEXT } from '../../utils/djangoContext';
import { resetCurrentCompoundsSettings } from '../preview/compounds/redux/actions';
import { resetProjectsReducer } from '../projects/redux/actions';
import { withLoadingProjects } from '../target/withLoadingProjects';
import { ToastContext } from '../toast';
import { EditTargetDialog } from '../target/editTargetDialog';
import { TOAST_LEVELS } from '../toast/constants';
import { TargetSettingsModal } from '../target/targetSettingsModal';
import { setEditTargetDialogOpen } from '../target/redux/actions';
import { TooltipPathProvider } from '../tooltip/TooltipPathContext';
// import * as cheerio from 'cheerio';

const useStyles = makeStyles(theme => ({
  root: {
    height: '100%',
    gap: theme.spacing(1),
    flexWrap: 'nowrap',
    padding: theme.spacing(),
    display: 'flex',
    flexDirection: 'column',
    width: '100%'
  }
}));

const Landing = memo(
  ({ resetSelectionState, resetTargetState, resetCurrentCompoundsSettings, resetProjectsReducer }) => {
    const dispatch = useDispatch();
    const classes = useStyles();

    const [isResizing, setIsResizing] = useState(false);
    const [resizer, setResizer] = useState(null);
    // const [targetListWidth, setTargetListWidth] = useState(450);
    const [publicTargetListHeight, setPublicTargetListHeight] = useState(window.innerHeight * 0.6);
    const [privateTargetListHeight, setPrivateTargetListHeight] = useState(window.innerHeight * 0.2);
    const [legacyTargetListHeight, setLegacyTargetListHeight] = useState(window.innerHeight * 0.2);

    const [privateTargets, setPrivateTargets] = useState([]);
    const [publicTargets, setPublicTargets] = useState([]);

    const target_id_list = useSelector(state => state.apiReducers.target_id_list);
    const legacy_target_id_list = useSelector(state => state.apiReducers.legacy_target_id_list);

    useEffect(() => {
      let tempPrivateTargets = [];
      let tempPublicTargets = [];
      target_id_list?.forEach(target => {
        if (target.project && typeof target.project === 'object') {
          if (target.external_url) {
            const blog = getBlogData(target.external_url);
            target.blog = blog;
          }
          if (target.project.open_to_public === false) {
            tempPrivateTargets.push(target);
          } else {
            tempPublicTargets.push(target);
          }
        }
      });
      //tu si vyberiem vsetko co potrebujem z blogu
      setPrivateTargets(tempPrivateTargets);
      setPublicTargets(tempPublicTargets);
    }, [target_id_list]);

    const getBlogData = async url => {
      const response = await fetch(url);
      const html = await response.text();
      console.log('html', html);
      // const $ = cheerio.load(html);
      // return {
      //   title:
      //     $('meta[property="og:title"]').attr('content') ||
      //     $('meta[name="twitter:title"]').attr('content') ||
      //     $('h1')
      //       .first()
      //       .text()
      //       .trim(),

      //   description:
      //     $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '',

      //   image:
      //     $('meta[property="og:image"]').attr('content') ||
      //     $('meta[name="twitter:image"]').attr('content') ||
      //     $('article img')
      //       .first()
      //       .attr('src') ||
      //     $('main img')
      //       .first()
      //       .attr('src') ||
      //     '',

      //   date:
      //     $('meta[property="article:published_time"]').attr('content') ||
      //     $('time')
      //       .first()
      //       .attr('datetime') ||
      //     $('time')
      //       .first()
      //       .text()
      //       .trim() ||
      //     '',

      //   firstParagraph:
      //     $('article p')
      //       .first()
      //       .text()
      //       .trim() ||
      //     $('main p')
      //       .first()
      //       .text()
      //       .trim() ||
      //     $('p')
      //       .first()
      //       .text()
      //       .trim()
      // };
    };

    const { toast, toastSuccess, toastError, toastInfo, toastWarning } = useContext(ToastContext);
    const [loginText, setLoginText] = useState(
      DJANGO_CONTEXT['username'] === 'NOT_LOGGED_IN' ? '' : "You're logged in as " + DJANGO_CONTEXT['username']
    );
    const toastMessages = useSelector(state => state.selectionReducers.toastMessages);
    const isEditTargetDialogOpen = useSelector(state => state.targetReducers.isEditTargetDialogOpen);

    const onModalClose = () => {
      dispatch(setEditTargetDialogOpen(false));
      dispatch(selectionActions.setTargetToEdit(null));
    };

    useEffect(() => {
      if (toastMessages?.length > 0) {
        toastMessages.forEach(message => {
          switch (message.level) {
            case TOAST_LEVELS.SUCCESS:
              toastSuccess(message.text);
              break;
            case TOAST_LEVELS.ERROR:
              toastError(message.text);
              break;
            case TOAST_LEVELS.INFO:
              toastInfo(message.text);
              break;
            case TOAST_LEVELS.WARNING:
              toastWarning(message.text);
              break;
            default:
              break;
          }
        });
        dispatch(selectionActions.setToastMessages([]));
      }
    }, [dispatch, toastError, toastInfo, toastMessages, toastSuccess, toastWarning]);

    useEffect(() => {
      if (DJANGO_CONTEXT['authenticated'] !== true) {
        setLoginText(
          <span>
            {'To view own projects login here: '}
            <Link href="/accounts/login" color="inherit" variant="subtitle2">
              FedID Login
            </Link>
          </span>
        );
      }

      const handleWindowResize = () => {
        setPublicTargetListHeight(window.innerHeight * 0.4);
        setPrivateTargetListHeight(window.innerHeight * 0.4);
        setLegacyTargetListHeight(window.innerHeight * 0.2);
      };

      window.addEventListener('resize', handleWindowResize);

      return () => {
        window.removeEventListener('resize', handleWindowResize);
      };
    }, []);

    useEffect(() => {
      resetTargetState();
      resetSelectionState();
      toast(loginText, {
        anchorOrigin: {
          vertical: 'bottom',
          horizontal: 'right'
        }
      });
      resetCurrentCompoundsSettings(true);
      resetProjectsReducer();
    }, [resetTargetState, resetSelectionState, toast, loginText, resetCurrentCompoundsSettings, resetProjectsReducer]);

    const handleMouseDownResizer = resizer => {
      setIsResizing(true);
      setResizer(resizer);
    };

    const handleMouseMove = useCallback(
      e => {
        if (!isResizing || resizer === null) return;
        const topPartWidth = e.clientY;
        const bottomPartWidth = window.innerHeight - topPartWidth;
        if (resizer === 1) {
          setPublicTargetListHeight(topPartWidth);
          setPrivateTargetListHeight(bottomPartWidth);
        } else if (resizer === 2) {
          setPrivateTargetListHeight(topPartWidth);
          setLegacyTargetListHeight(bottomPartWidth);
        }
      },
      [isResizing, resizer]
    );

    const handleMouseUp = useCallback(() => {
      setIsResizing(false);
      setResizer(null);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }, [handleMouseMove]);

    useEffect(() => {
      if (isResizing) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
      } else {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      }
    }, [isResizing, handleMouseMove, handleMouseUp]);

    return (
      <TooltipPathProvider path="targetLists">
        <Grid container className={classes.root}>
          <Grid item style={{ height: publicTargetListHeight }}>
            <TargetList list={publicTargets} title={'Public targets'} />
          </Grid>
          <div
            style={{
              cursor: 'row-resize',
              width: '100%',
              height: 3,
              backgroundColor: '#eeeeee',
              borderRadius: '3px'
            }}
            className="resizer-left"
            onMouseDown={() => handleMouseDownResizer(1)}
          ></div>
          <Grid item style={{ height: privateTargetListHeight }}>
            <TargetList list={privateTargets} title={'Private targets'} authRequired={true} />
          </Grid>
          <div
            style={{
              cursor: 'row-resize',
              width: '100%',
              height: 3,
              backgroundColor: '#eeeeee',
              borderRadius: '3px'
            }}
            className="resizer-right"
            onMouseDown={() => handleMouseDownResizer(2)}
          ></div>
          <Grid item style={{ height: legacyTargetListHeight }}>
            <TargetList list={legacy_target_id_list} title={'Legacy targets'} legacy={true} />
          </Grid>
        </Grid>
        <TargetSettingsModal openModal={isEditTargetDialogOpen} onModalClose={onModalClose} isTargetOn={false} />
      </TooltipPathProvider>
    );
  }
);

function mapStateToProps(state) {
  return {};
}
const mapDispatchToProps = {
  resetSelectionState: selectionActions.resetSelectionState,
  resetTargetState: apiActions.resetTargetState,
  resetCurrentCompoundsSettings,
  resetProjectsReducer
};

export default connect(mapStateToProps, mapDispatchToProps)(withLoadingProjects(Landing));
