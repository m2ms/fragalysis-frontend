import { Popper } from '@material-ui/core';
import React from 'react';
import { makeStyles } from '@material-ui/core';
import { Button } from '../../common/Inputs/Button';

const useStyles = makeStyles(theme => ({
  jobPopup: {
    width: '300px',
    borderRadius: '10px',
    border: '1px solid #000',
    display: 'flex',
    flexDirection: 'column'
  },

  topPopup: {
    width: '100%',
    borderRadius: '10px 10px 0 0',
    backgroundColor: '#3f51b5',
    color: '#fff',
    paddingLeft: '20px',
    lineHeight: '30px'
  },

  popUpButton: {
    borderRadius: '0 10px 0 0',
    backgroundColor: '#d33f3f',
    color: '#fff',
    padding: '5px 10px 5px 10px',
    border: 'none',
    float: 'right',
    height: '30px',
    '&:hover': {
      borderRadius: '0 10px 0 0',
      backgroundColor: '#aa3939',
      color: '#fff',
      cursor: 'pointer'
    }
  },

  bodyPopup: {
    padding: '10px',
    backgroundColor: '#f3f3f3',
    borderRadius: '0 0 10px 10px'
  }
}));

const JobPopup = ({ jobPopUpAnchorEl, setJobPopUpAnchorEl, job }) => {
  const classes = useStyles();
  return (
    <Popper
      open={!!jobPopUpAnchorEl}
      onClose={() => setJobPopUpAnchorEl(null)}
      anchorEl={jobPopUpAnchorEl}
      placement="right"
    >
      <div className={classes.jobPopup}>
        <div className={classes.topPopup}>
          <span>Job</span>
          <button className={classes.popUpButton} onClick={() => setJobPopUpAnchorEl(null)}>
            X
          </button>
        </div>
        <div className={classes.bodyPopup}>
          <p>
            Status: <strong>{job.status}</strong>
          </p>
          <p>
            Parameters: <strong>{job.parameters}</strong>
          </p>
          <p>
            Results: <strong>{job.results}</strong>
          </p>
          <Button color="primary">Open associated snapshot</Button>
        </div>
      </div>
    </Popper>
  );
};

export default JobPopup;
