import React, { memo, useLayoutEffect, useMemo, useState } from 'react';
import Modal from '../../../common/Modal';
import { useDispatch, useSelector } from 'react-redux';
import { Grid, makeStyles, Checkbox, Typography, FormControlLabel } from '@material-ui/core';
import { Button } from '../../../common/Inputs/Button';
import { getObservationIdsForCompound, getObservationsForCompound } from '../redux/dispatchActions';
import { setDiffVisible, setEventVisible, setSigmaaVisible } from '../../../../reducers/api/actions';

const useStyles = makeStyles(theme => ({
  body: {
    width: '100%',
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(1)
  },
  margin: {
    marginTop: theme.spacing(1)
  },
  checkbox: {
    margin: theme.spacing(0)
  }
}));

export const DensityMapsModal = memo(
  ({ openDialog, setOpenDialog, data, setDensity, isQualityOn, isCompound = false }) => {
    const dispatch = useDispatch();
    const classes = useStyles();
    // const [valueSigmaa, setValueSigmaa] = useState(false);
    // const [valueDiff, setValueDiff] = useState(false);
    // const [valueEvent, setValueEvent] = useState(false);
    const [valueAtomQuality, setValueAtomQuality] = useState(isQualityOn);
    // const proteinData = data.proteinData;
    const allMolecules = useSelector(state => state.apiReducers.all_mol_lists);

    const observationsDataList = useMemo(() => {
      if (isCompound) {
        return dispatch(getObservationsForCompound(data));
      } else {
        return [data];
      }
      //there is a warning but we need to keep allMolecules as a dependency to update the list of observations
    }, [data, dispatch, isCompound, allMolecules]);
    const observationIdsDataList = useMemo(() => {
      if (isCompound) {
        return dispatch(getObservationIdsForCompound(data));
      } else {
        return [data.id];
      }
      //there is a warning but we need to keep allMolecules as a dependency to update the list of observations
    }, [data, dispatch, isCompound, allMolecules]);
    let firstObservation = null;
    if (observationIdsDataList?.length > 0) {
      firstObservation = observationsDataList[0];
    }

    let valueSigmaa = observationsDataList.reduce((result, obs) => {
      return result || !!obs?.proteinData?.sigmaa_visible;
    }, false);

    let valueDiff = observationsDataList.reduce((result, obs) => {
      return result || !!obs?.proteinData?.diff_visible;
    }, false);

    let valueEvent = observationsDataList.reduce((result, obs) => {
      return result || !!obs?.proteinData?.event_visible;
    }, false);

    // In case quality gets turned on from elsewhere
    useLayoutEffect(() => {
      setValueAtomQuality(isQualityOn);
      // setValueSigmaa(isSigmaaOn);
      // setValueDiff(isDiffOn);
      // setValueEvent(isEventOn);
    }, [isQualityOn]);

    const toggleRenderSigmaaMap = () => {
      const newValue = !valueSigmaa;
      observationsDataList.forEach(obs => {
        obs.proteinData.render_sigmaa = newValue;
        dispatch(setSigmaaVisible(newValue, obs.id));
      });
    };

    const toggleRenderDiffMap = () => {
      const newValue = !valueDiff;
      observationsDataList.forEach(obs => {
        obs.proteinData.render_diff = newValue;
        dispatch(setDiffVisible(newValue, obs.id));
      });
    };

    const toggleRenderEventMap = () => {
      const newValue = !valueEvent;
      observationsDataList.forEach(obs => {
        obs.proteinData.render_event = newValue;
        dispatch(setEventVisible(newValue, obs.id));
      });
    };

    //TODO: fix this - quality was set in different way
    const toggleRenderAtomQuality = () => {
      const newValue = !valueAtomQuality;
      observationsDataList.forEach(obs => {
        // obs.proteinData.render_quality = false;
        dispatch(setValueAtomQuality(newValue, obs.id));
      });
    };

    const handleCloseModal = () => {
      dispatch(setOpenDialog(false));
    };

    const handleSaveButton = () => {
      dispatch(setOpenDialog(false));
      setDensity(observationsDataList);
    };

    return (
      <Modal open={openDialog}>
        <>
          <Typography variant="h4">Density rendering maps selection</Typography>
          <Typography variant="subtitle1" gutterBottom className={classes.margin}>
            {data.protein_code}
          </Typography>
          <Grid container direction="column" className={classes.body}>
            <Grid item>
              {observationsDataList.reduce((result, obs) => {
                return result && obs.proteinData?.event_info;
              }, true) && (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={valueEvent}
                      name="event"
                      color="primary"
                      onChange={() => {
                        toggleRenderEventMap();
                      }}
                    />
                  }
                  label="Render map event"
                  labelPlacement="end"
                  className={classes.checkbox}
                />
              )}
            </Grid>
            <Grid item>
              {observationsDataList.reduce((result, obs) => {
                return result && obs.proteinData?.sigmaa_info;
              }, true) && (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={valueSigmaa}
                      name="sigma"
                      color="primary"
                      onChange={() => {
                        toggleRenderSigmaaMap();
                      }}
                    />
                  }
                  label="Render map sigmaa"
                  labelPlacement="end"
                  className={classes.checkbox}
                />
              )}
            </Grid>
            <Grid item>
              {observationsDataList.reduce((result, obs) => {
                return result && obs.proteinData?.diff_info;
              }, true) && (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={valueDiff}
                      name="diff"
                      color="primary"
                      onChange={() => {
                        toggleRenderDiffMap();
                      }}
                    />
                  }
                  label="Render map diff"
                  labelPlacement="end"
                  className={classes.checkbox}
                />
              )}
            </Grid>
            <Grid item>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={valueAtomQuality}
                    name="diff"
                    color="primary"
                    onChange={() => {
                      toggleRenderAtomQuality();
                    }}
                  />
                }
                label="Render atom quality"
                labelPlacement="end"
                className={classes.checkbox}
              />
            </Grid>
          </Grid>
          <Grid container justify="flex-end" direction="row">
            <Grid item>
              <Button color="secondary" onClick={handleCloseModal}>
                Cancel
              </Button>
            </Grid>
            <Grid item>
              <Button color="primary" onClick={handleSaveButton}>
                Save
              </Button>
            </Grid>
          </Grid>
        </>
      </Modal>
    );
  }
);
