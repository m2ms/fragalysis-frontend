import { Popper } from '@material-ui/core';
import React from 'react';
import { makeStyles } from '@material-ui/core';
import { Button } from '../../common/Inputs/Button';
import { useDispatch } from 'react-redux';
import { setIsOpenModalBeforeExit, setSelectedSnapshotToSwitch } from '../../snapshot/redux/actions';
import { setJobPopUpAnchorEl } from '../../projects/redux/actions';

const useStyles = makeStyles(theme => ({
  jobPopup: {
    width: '300px',
    borderRadius: '5px',
    border: '1px solid #000',
    display: 'flex',
    flexDirection: 'column'
  },

  topPopup: {
    width: '100%',
    borderRadius: '5px 5px 0 0',
    backgroundColor: '#3f51b5',
    color: '#fff',
    paddingLeft: '20px',
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

const JobPopup = ({ jobPopUpAnchorEl, jobPopupInfo }) => {
  const classes = useStyles();
  const dispatch = useDispatch();
  const { jobInfo, hash } = jobPopupInfo;

  return (
    <Popper
      open={!!jobPopUpAnchorEl}
      onClose={() => dispatch(setJobPopUpAnchorEl(null))}
      anchorEl={jobPopUpAnchorEl}
      placement="right"
    >
      <div className={classes.jobPopup}>
        <div className={classes.topPopup}>
          <span>Job</span>
          <button className={classes.popUpButton} onClick={() => dispatch(setJobPopUpAnchorEl(null))}>
            X
          </button>
        </div>
        <div className={classes.bodyPopup}>
          <p>
            Status: <strong>{jobInfo?.status}</strong>
          </p>
          <p>
            Parameters: <strong>{jobInfo?.parameters}</strong>
          </p>
          <p>
            Results: <strong>{jobInfo?.results}</strong>
          </p>
          <Button
            color="primary"
            onClick={() => {
              dispatch(setSelectedSnapshotToSwitch(hash));
              dispatch(setIsOpenModalBeforeExit(true));
            }}
          >
            Open associated snapshot
          </Button>
        </div>
      </div>
    </Popper>
  );
};

export default JobPopup;
