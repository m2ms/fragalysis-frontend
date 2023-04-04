/**
 * Created by abradley on 15/03/2018.
 */
import React, { memo, useContext, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { VectorCompoundView } from './vectorCompoundView';
import { Panel } from '../../common/Surfaces/Panel';
import { Button } from '../../common/Inputs/Button';
import { Grid, Box, makeStyles, TextField, CircularProgress } from '@material-ui/core';
import { SelectAll, Delete } from '@material-ui/icons';
import {
  clearAllSelectedVectorCompounds,
  loadNextPageOfVectorCompounds,
  onChangeVectorCompoundClassValue,
  onKeyDownVectorCompoundClass,
  selectAllVectorCompounds
} from './redux/dispatchActions';
import { vectorCompoundsColors } from './redux/constants';
import InfiniteScroll from 'react-infinite-scroller';
import { getCanLoadMoreVectorCompounds, getVectorCompoundListOffset } from './redux/selectors';
import { NglContext } from '../../nglView/nglProvider';
import { VIEWS } from '../../../constants/constants';
import classNames from 'classnames';

const useStyles = makeStyles(theme => ({
  textField: {
    marginLeft: theme.spacing(1),
    marginRight: theme.spacing(1),
    width: 76,
    '& .MuiFormLabel-root': {
      paddingLeft: theme.spacing(1)
    }
  },
  selectedInput: {
    border: `2px groove ${theme.palette.primary.main}`
  },

  [vectorCompoundsColors.blue.key]: {
    backgroundColor: vectorCompoundsColors.blue.color
  },
  [vectorCompoundsColors.red.key]: {
    backgroundColor: vectorCompoundsColors.red.color
  },
  [vectorCompoundsColors.green.key]: {
    backgroundColor: vectorCompoundsColors.green.color
  },
  [vectorCompoundsColors.purple.key]: {
    backgroundColor: vectorCompoundsColors.purple.color
  },
  [vectorCompoundsColors.apricot.key]: {
    backgroundColor: vectorCompoundsColors.apricot.color
  },

  paddingProgress: {
    padding: theme.spacing(1),
    width: 100,
    height: 100
  },
  infinityContainer: {
    width: '100%',
    overflow: 'auto',
    padding: theme.spacing(1)
  },
  compoundList: {
    display: 'flex',
    flexWrap: 'wrap'
  }
}));

export const VectorCompoundList = memo(() => {
  const classes = useStyles();
  const panelRef = useRef(null);
  const dispatch = useDispatch();
  const { getNglView } = useContext(NglContext);
  const majorViewStage = getNglView(VIEWS.MAJOR_VIEW) && getNglView(VIEWS.MAJOR_VIEW).stage;

  const blueInput = useSelector(state => state.previewReducers.vectorCompounds[vectorCompoundsColors.blue.key]);
  const redInput = useSelector(state => state.previewReducers.vectorCompounds[vectorCompoundsColors.red.key]);
  const greenInput = useSelector(state => state.previewReducers.vectorCompounds[vectorCompoundsColors.green.key]);
  const purpleInput = useSelector(state => state.previewReducers.vectorCompounds[vectorCompoundsColors.purple.key]);
  const apricotInput = useSelector(state => state.previewReducers.vectorCompounds[vectorCompoundsColors.apricot.key]);

  const inputs = {
    [vectorCompoundsColors.blue.key]: blueInput,
    [vectorCompoundsColors.red.key]: redInput,
    [vectorCompoundsColors.green.key]: greenInput,
    [vectorCompoundsColors.purple.key]: purpleInput,
    [vectorCompoundsColors.apricot.key]: apricotInput
  };

  const currentCompoundClass = useSelector(state => state.previewReducers.vectorCompounds.currentCompoundClass);
  const canLoadMoreCompounds = useSelector(state => getCanLoadMoreVectorCompounds(state));
  const currentVector = useSelector(state => state.selectionReducers.currentVector);
  const currentCompounds = useSelector(state => state.previewReducers.vectorCompounds.currentCompounds);
  const compoundsListOffset = useSelector(state => getVectorCompoundListOffset(state));

  let headerMessage = currentCompounds.length + ' Compounds on vector to pick';
  if (currentVector === null) {
    headerMessage = 'Not selected vector';
  }

  return (
    <Panel hasHeader title={headerMessage} ref={panelRef}>
      {currentCompounds && (
        <Box width="100%">
          <Grid container direction="row" justify="space-between" alignItems="center">
            {Object.keys(vectorCompoundsColors).map(item => (
              <Grid item key={item}>
                <TextField
                  id={`${item}`}
                  key={`CLASS_${item}`}
                  variant="standard"
                  className={classNames(
                    classes.textField,
                    classes[item],
                    currentCompoundClass === item && classes.selectedInput
                  )}
                  label={vectorCompoundsColors[item].text}
                  onChange={e => dispatch(onChangeVectorCompoundClassValue(e))}
                  onKeyDown={e => dispatch(onKeyDownVectorCompoundClass(e))}
                  value={inputs[item] || ''}
                />
              </Grid>
            ))}
          </Grid>
          <Grid container justify="space-between" className={classes.infinityContainer}>
            <Box width="inherit" overflow="auto">
              <InfiniteScroll
                pageStart={0}
                loadMore={() => dispatch(loadNextPageOfVectorCompounds())}
                hasMore={canLoadMoreCompounds}
                loader={
                  <div className="loader" key={`loader_${0}`}>
                    <div className={classes.paddingProgress}>
                      <CircularProgress />
                    </div>
                  </div>
                }
                useWindow={false}
                className={classes.compoundList}
              >
                {currentCompounds.slice(0, compoundsListOffset).map((data, index) => {
                  return <VectorCompoundView key={index} height={100} width={100} data={data} index={index} />;
                })}
              </InfiniteScroll>
            </Box>
          </Grid>
          <Button color="primary" onClick={() => dispatch(selectAllVectorCompounds())} startIcon={<SelectAll />}>
            Select All
          </Button>
          <Button
            color="primary"
            onClick={() => dispatch(clearAllSelectedVectorCompounds(majorViewStage))}
            startIcon={<Delete />}
          >
            Clear Selection
          </Button>
        </Box>
      )}
    </Panel>
  );
});
