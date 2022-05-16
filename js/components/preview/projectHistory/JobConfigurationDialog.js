import React, { useState } from 'react';
import { Box, ClickAwayListener, IconButton, MenuItem, Tooltip, Typography, Paper, Modal } from '@material-ui/core';
import { makeStyles } from '@material-ui/core';
import { Button } from '../../common/Inputs/Button';
import { Formik, Form, Field } from 'formik';
import { TextField } from 'formik-material-ui';
import HelpIcon from '@material-ui/icons/Help';
import { useSelector } from 'react-redux';
import { useDispatch } from 'react-redux';
import {
  setJobConfigurationDialogOpen,
  setJobLauncherDialogOpen,
  setJobLauncherData
} from '../../projects/redux/actions';
import { jobFileTransfer } from '../../projects/redux/dispatchActions';

const useStyles = makeStyles(theme => ({
  jobLauncherPopup: {
    width: '750px',
    borderRadius: '5px',
    border: '1px solid #000',
    display: 'flex',
    flexDirection: 'column',
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)'
  },

  topPopup: {
    width: '100%',
    borderRadius: '5px 5px 0 0',
    backgroundColor: '#3f51b5',
    color: '#fff',
    paddingLeft: '10px',
    lineHeight: '30px'
  },

  popUpButton: {
    borderRadius: '0 5px 0 0',
    backgroundColor: '#d33f3f',
    color: '#fff',
    padding: '5px 10px 5px 10px',
    border: 'none',
    float: 'right',
    height: '30px',
    '&:hover': {
      borderRadius: '0 5px 0 0',
      backgroundColor: '#aa3939',
      color: '#fff',
      cursor: 'pointer'
    }
  },

  bodyPopup: {
    padding: '10px',
    backgroundColor: '#ffffff',
    borderRadius: '0 0 5px 5px'
  },

  sideBody: {
    width: '50%',
    padding: '5px'
  },

  flexRow: {
    display: 'flex',
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'start'
  },

  flexColumn: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%'
  },

  marginTop5: {
    marginTop: '5px'
  },

  fontWeightBold: {
    fontWeight: 'bold'
  },

  marginLeft10: {
    marginLeft: '10px'
  },

  width70: {
    width: '70%'
  },

  width30: {
    width: '30%'
  },

  width60: {
    width: '60%'
  },

  floatLeft: {
    float: 'left'
  },

  floatRight: {
    float: 'right'
  },

  radioPlusDropdown: {
    width: '30%',
    marginTop: '20px'
  },

  typographyH: {
    marginTop: '10px',
    fontWeight: 'bold'
  },

  successMsg: {
    padding: '10px',
    background: '#66BB6A',
    color: '#ffffff',
    fontWeight: 'bold'
  },

  errorMsg: {
    padding: '10px',
    background: 'red',
    color: '#ffffff',
    fontWeight: 'bold'
  }
}));

const JobConfigurationDialog = ({ snapshots }) => {
  const classes = useStyles();
  const dispatch = useDispatch();

  const [open, setOpen] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const handleTooltipClose = () => {
    setOpen(false);
  };
  const handleTooltipOpen = () => {
    setOpen(true);
  };

  const jobConfigurationDialogOpen = useSelector(state => state.projectReducers.jobConfigurationDialogOpen);

  const getAllMolecules = useSelector(state => state.apiReducers.all_mol_lists);

  const currentSnapshotID = useSelector(state => state.projectReducers.currentSnapshot.id);
  const targetId = useSelector(state => state.apiReducers.target_on);

  // get ids of selected/visible inputs
  const currentSnapshotSelectedCompoundsIDs = useSelector(state => state.selectionReducers.moleculesToEdit);
  const currentSnapshotVisibleCompoundsIDs = useSelector(state => state.selectionReducers.fragmentDisplayList);

  const target_on_name = useSelector(state => state.apiReducers.target_on_name);

  const getMoleculeEnumName = title => {
    let newTitle = title.replace(new RegExp(`${target_on_name}-`, 'i'), '');
    newTitle = newTitle.replace(new RegExp(':.*$', 'i'), '');

    return newTitle;
  };

  const getFragmentTemplate = fragment => {
    return `fragalysis-files/${target_on_name}/${fragment}.mol`;
  };

  const getProteinTemplate = protein => {
    return `fragalysis-files/${target_on_name}/${protein}_apo-desolv.pdb`;
  };

  const getMoleculeTitle = title => {
    return title.replace(new RegExp(':.*$', 'i'), '');
  };

  // get protein_code from ids of selected/visible inputs
  const currentSnapshotSelectedCompounds = getAllMolecules
    .filter(molecule => currentSnapshotSelectedCompoundsIDs.includes(molecule.id))
    .map(molecule => getMoleculeTitle(molecule.protein_code));
  const currentSnapshotVisibleCompounds = getAllMolecules
    .filter(molecule => currentSnapshotVisibleCompoundsIDs.includes(molecule.id))
    .map(molecule => getMoleculeTitle(molecule.protein_code));

  const jobList = useSelector(state => state.projectReducers.jobList);

  const onSubmitForm = async ({ job, inputs, snapshot }) => {
    console.log(snapshot);
    let chosenLHSCompounds = null;
    if (inputs === 'snapshot') {
      chosenLHSCompounds = snapshot.additional_info.currentSnapshotSelectedCompounds;
    } else if (inputs === 'selected-inputs') {
      chosenLHSCompounds = currentSnapshotSelectedCompounds;
    } else if (inputs === 'visible-inputs') {
      chosenLHSCompounds = currentSnapshotVisibleCompounds;
    }

    // Close the actual pop up window
    dispatch(setJobConfigurationDialogOpen(false));

    const getFilteredJob = job => {
      return jobList.find(jobFiltered => job === jobFiltered.id);
    };

    // Set options for second window
    dispatch(
      setJobLauncherData({
        job: getFilteredJob(job),
        // Prepares data for expanding, see comments in JobFragmentProteinSelectWindow
        data: {
          'lhs-fragments': {
            enum: chosenLHSCompounds.map(fragment => getFragmentTemplate(fragment)),
            enumNames: chosenLHSCompounds.map(compound => getMoleculeEnumName(compound))
          },
          'lhs-protein-apo-desolv': {
            enum: chosenLHSCompounds.map(protein => getProteinTemplate(protein)),
            enumNames: chosenLHSCompounds.map(compound => getMoleculeEnumName(compound))
          }
        }
      })
    );

    jobFileTransfer({
      snapshot: currentSnapshotID,
      target: targetId,
      // squonk_project: dispatch(getSquonkProject()),
      squonk_project: 'project-e1ce441e-c4d1-4ad1-9057-1a11dbdccebe',
      proteins: chosenLHSCompounds.join()
    })
      .then(resp => {
        // Open second window
        setErrorMsg(null);
        setIsError(false);
        dispatch(setJobLauncherDialogOpen(true));
      })
      .catch(err => {
        console.log(`Job file transfer failed: ${err}`);
        setErrorMsg(err.response.data);
        setIsError(true);
      });
  };

  const onClose = () => {
    setErrorMsg(null);
    setIsError(false);
    dispatch(setJobConfigurationDialogOpen(false));
  };

  return (
    <Modal open={jobConfigurationDialogOpen} onClose={onClose}>
      <div className={classes.jobLauncherPopup}>
        <div className={classes.topPopup}>
          <span>Job configuration</span>
          <button className={classes.popUpButton} onClick={onClose}>
            X
          </button>
        </div>
        <div className={classes.bodyPopup}>
          <Formik initialValues={{ inputs: 'snapshot', snapshot: '', job: '' }} onSubmit={onSubmitForm}>
            {({ values, isValid }) => (
              <Form className={classes.flexRow}>
                <div className={classes.sideBody}>
                  <Field
                    component={TextField}
                    type="text"
                    name="job"
                    select
                    variant="standard"
                    margin="none"
                    label="Fragment network merges"
                    InputLabelProps={{ shrink: true }}
                    className={classes.width70}
                    disabled={false}
                  >
                    {Object.values(jobList).map(item => (
                      <MenuItem key={item.id} value={item.id}>
                        {item.name}
                      </MenuItem>
                    ))}
                  </Field>
                  <ClickAwayListener onClickAway={handleTooltipClose}>
                    <Tooltip
                      PopperProps={{
                        disablePortal: true
                      }}
                      onClose={handleTooltipClose}
                      open={open}
                      disableFocusListener
                      disableHoverListener
                      disableTouchListener
                      title="Morbi ac enim quis magna lobortis pulvinar non id enim."
                    >
                      <IconButton aria-label="Help" size="medium" color="default" onClick={handleTooltipOpen}>
                        <HelpIcon />
                      </IconButton>
                    </Tooltip>
                  </ClickAwayListener>
                  <Typography className={classes.typographyH}>Description</Typography>
                  <Typography align="justify" className={classes.marginTop5}>
                    {jobList.filter(jobType => jobType['id'] === values.job).map(jobType => jobType['description'])}
                  </Typography>
                </div>
                <div className={classes.sideBody}>
                  <Typography className={classes.fontWeightBold}>Inputs:</Typography>
                  <Box className={classes.flexColumn}>
                    <div className={classes.flexRow}>
                      <div className={classes.radioPlusDropdown}>
                        <Field type="radio" name="inputs" value="snapshot" />
                        Snapshot
                      </div>

                      <Field
                        component={TextField}
                        type="text"
                        name="snapshot"
                        select
                        variant="standard"
                        margin="none"
                        InputLabelProps={{ shrink: true }}
                        className={(classes.marginLeft10, classes.width60)}
                        label="Choose the snapshot"
                        disabled={values.inputs !== 'snapshot'}
                        validate={value => {
                          if (values.inputs === 'snapshot' && !value.additional_info) {
                            return `Snapshot ${value.title} is not compatible with job functionality. You can try to select the snapshot directly and choose the option 'selected molecules'`;
                          }
                          // TODO what to do if snapshot has nothing selected?
                        }}
                      >
                        {Object.values(snapshots).map(item => (
                          <MenuItem key={item.id} value={item}>
                            {item.title}
                          </MenuItem>
                        ))}
                      </Field>
                    </div>
                    <div>
                      <Field type="radio" name="inputs" value="selected-inputs" />
                      Selected inputs
                    </div>
                    <div>
                      <Field type="radio" name="inputs" value="visible-inputs" />
                      Visible inputs
                    </div>
                  </Box>
                  {isError && (
                    <Paper variant="elevation" rounded="true" className={classes.errorMsg}>
                      {errorMsg}
                    </Paper>
                  )}
                  <Button color="primary" size="large" type="submit" disabled={!isValid}>
                    Launch
                  </Button>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      </div>
    </Modal>
  );
};

export default JobConfigurationDialog;
