import React from 'react';
import { Modal } from '@material-ui/core';
import { makeStyles } from '@material-ui/core';
import { useSelector } from 'react-redux';
import { useDispatch } from 'react-redux';
import { setJobFragmentProteinSelectWindowAnchorEl } from '../../projects/redux/actions';
import { MuiForm as JSONForm } from '@rjsf/material-ui';
import jobconfig from '../../../../jobconfigs/fragalysis-job-spec.json';

const useStyles = makeStyles(theme => ({
  jobLauncherPopup: {
    width: '750px',
    borderRadius: '5px',
    border: '1px solid #000',
    display: 'flex',
    flexDirection: 'column',
    position: 'absolute',
    top: '20%',
    left: '30%'
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
  }
}));

const JobFragmentProteinSelectWindow = () => {
  const classes = useStyles();
  const dispatch = useDispatch();

  const jobFragmentProteinSelectWindowAnchorEl = useSelector(
    state => state.projectReducers.jobFragmentProteinSelectWindowAnchorEl
  );

  // Get data from previous window
  const jobLauncherData = useSelector(state => state.projectReducers.jobLauncherData);

  // Remove tags from title
  const target_on_name = useSelector(state => state.apiReducers.target_on_name);
  const getMoleculeTitle = title => {
    let newTitle = title.replace(new RegExp(`${target_on_name}-`, 'i'), '');
    newTitle = newTitle.replace(new RegExp(':.*$', 'i'), '');

    return newTitle;
  };

  // Prepare options for multiselect field
  const getMoleculesShortNames = () => {
    if (jobLauncherData !== null && jobLauncherData.chosenCompounds !== null)
      return jobLauncherData.chosenCompounds.map(compound => getMoleculeTitle(compound));
    else return null;
  };
  const getMoleculesEnums = () => {
    if (jobLauncherData !== null && jobLauncherData.chosenCompounds !== null) return jobLauncherData.chosenCompounds;
    else return [''];
  };

  const compoundsOptions = {
    type: 'string',
    enum: getMoleculesEnums(),
    enumNames: getMoleculesShortNames()
  };

  const selects = {
    fragments: {
      title: 'Fragment molecules',
      type: 'array',
      uniqueItems: true,
      items: {
        ...compoundsOptions
      }
    },
    protein: { title: 'PDB file for protein', ...compoundsOptions }
  };

  const getSelects = () => {
    if (jobLauncherData !== null && jobLauncherData.job !== null && jobLauncherData.job.slug == 'fragmenstein-combine')
      return selects;
    else return {};
  };

  const options = JSON.parse(jobconfig.variables.options);
  const outputs = JSON.parse(jobconfig.variables.outputs);
  // Prepare schema for FORM
  const schema = {
    type: options.type,
    required: [...options.required],
    properties: { ...getSelects(), ...options.properties, ...outputs.properties }
  };

  const getFragmentTemplate = fragment => {
    return `/fragalysis-files/${target_on_name}/${fragment}.mol`;
  };

  const getProteinTemplate = protein => {
    return `/fragalysis-files/${target_on_name}/${protein}-apo_desolv.pdb`;
  };

  const onSubmitForm = event => {
    let formData = event.formData;
    // map fragments to template
    if (formData.fragments !== null) {
      formData.fragments = formData.fragments.map(fragment => getFragmentTemplate(fragment));
    }

    // map proteins to template
    if (formData.protein !== null) {
      formData.protein = getProteinTemplate(formData.protein);
    }

    console.log(formData);
  };

  return (
    <Modal
      open={!!jobFragmentProteinSelectWindowAnchorEl}
      onClose={() => dispatch(setJobFragmentProteinSelectWindowAnchorEl(null))}
      hideBackdrop
    >
      <div className={classes.jobLauncherPopup}>
        <div className={classes.topPopup}>
          <span>Job launcher</span>
          <button
            className={classes.popUpButton}
            onClick={() => dispatch(setJobFragmentProteinSelectWindowAnchorEl(null))}
          >
            X
          </button>
        </div>
        <div className={classes.bodyPopup}>
          <JSONForm schema={schema} onSubmit={onSubmitForm} onChange={event => {}} />
        </div>
      </div>
    </Modal>
  );
};

export default JobFragmentProteinSelectWindow;
