import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@material-ui/core';
import React, { useContext, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { VIEWS } from '../../../constants/constants';
import { Button } from '../../common/Inputs/Button';
import {
  clearDatasetSettings,
  removeObjectsFromDeletedDataset,
  unselectMoleculesFromDeletedDataset
} from '../../datasets/redux/dispatchActions';
import { NglContext } from '../../nglView/nglProvider';
import { getSelectedJobs } from './redux/selectors';

export const JobDeleteDialog = ({ open, onClose }) => {
  const dispatch = useDispatch();
  const selectedJobs = useSelector(getSelectedJobs);

  const { getNglView } = useContext(NglContext);
  const stage = getNglView(VIEWS.MAJOR_VIEW) && getNglView(VIEWS.MAJOR_VIEW).stage;

  const [loading, setLoading] = useState(false);

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Are you sure you want to delete selected jobs?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Deleting selected jobs will delete all compound datasets which were generated by the selected jobs. Proceed?
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button
          loading={loading}
          onClick={async () => {
            try {
              setLoading(true);

              // TODO API calls
              const promises = [];

              await Promise.all(promises);

              selectedJobs.forEach(job => {
                const datasetID = job.dataset_id; // TODO replace with real field
                dispatch(clearDatasetSettings(datasetID));

                // Removes all objects from NGL
                dispatch(removeObjectsFromDeletedDataset(datasetID, 'ligand', stage));
                dispatch(removeObjectsFromDeletedDataset(datasetID, 'protein', stage));
                dispatch(removeObjectsFromDeletedDataset(datasetID, 'complex', stage));
                dispatch(removeObjectsFromDeletedDataset(datasetID, 'surface', stage));
                // Unselects selected molecules
                dispatch(unselectMoleculesFromDeletedDataset(datasetID));
              });
            } catch (err) {
              console.error(err);
            } finally {
              setLoading(false);
              onClose();
            }
          }}
          color="primary"
        >
          Yes
        </Button>
        <Button loading={loading} onClick={onClose} color="primary">
          No
        </Button>
      </DialogActions>
    </Dialog>
  );
};
