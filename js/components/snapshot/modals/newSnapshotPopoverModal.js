import React, { memo } from 'react';
import { SlideOutDialog } from '../../common/Modal/SlideOutDialog/slideOutDialog';
import { useDispatch, useSelector } from 'react-redux';
import { setOpenSnapshotSavingDialog } from '../redux/actions';
import { NewSnapshotForm } from './newSnapshotForm';
import { AddProjectDetail } from '../../projects/addProjectDetail';
import { DJANGO_CONTEXT } from '../../../utils/djangoContext';

export const NewSnapshotPopoverModal = memo(({}) => {
  const dispatch = useDispatch();
  const openSavingDialog = useSelector(state => state.snapshotReducers.openSavingDialog);
  const dialogCurrentStep = useSelector(state => state.snapshotReducers.dialogCurrentStep);
  const projectID = useSelector(state => state.projectReducers.currentProject.projectID);
  const forceCreateProject = useSelector(state => state.projectReducers.forceCreateProject);
  const saveButtonRef = useSelector(state => state.snapshotReducers.saveButtonRef);

  const handleCloseModal = () => {
    dispatch(setOpenSnapshotSavingDialog(false));
  };

  return (
    <SlideOutDialog open={openSavingDialog} anchorEl={saveButtonRef} onClose={handleCloseModal}>
      {(!projectID || forceCreateProject === true) && dialogCurrentStep === 0 && DJANGO_CONTEXT['pk'] && (
        <AddProjectDetail handleCloseModal={handleCloseModal} />
      )}
      {projectID && forceCreateProject === false && <NewSnapshotForm handleCloseModal={handleCloseModal} />}
    </SlideOutDialog>
  );
});
