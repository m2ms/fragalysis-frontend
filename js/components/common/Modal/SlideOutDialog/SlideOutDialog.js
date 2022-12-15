import React from 'react';
import { Popover } from '@material-ui/core';

export const SlideOutDialog = ({
  children,
  anchorEl,
  open,
  handleClose,
  anchorOrigin = { vertical: 'bottom', horizontal: 'left' }
}) => {
  return (
    <Popover open={open} anchorEl={anchorEl} anchorOrigin={anchorOrigin} onClose={handleClose}>
      {children}
    </Popover>
  );
};
