import React, { Fragment } from 'react';
import { Dialog, DialogContent, DialogTitle, Typography } from '@material-ui/core';
// eslint-disable-next-line import/extensions
import jobconfig from '../../../../jobconfigs/fragalysis-job-spec.json';

const renderListItem = item => <li key={item}>{item}</li>;

const renderInput = input => {
  if (Array.isArray(input)) {
    return input.map(i => renderListItem(i));
  } else if (typeof input === 'object') {
    return renderListItem(JSON.stringify(input));
  }
  return renderListItem(input);
};

export const JobVariablesDialog = ({ open, onClose, title, variableType, jobInfo }) => {
  const jobSpec = !!jobInfo ? JSON.parse(jobInfo.squonk_job_spec) : null;
  const jobVariables = jobSpec?.variables || {};

  const variable = jobconfig.variables[variableType] ? JSON.parse(jobconfig.variables[variableType]) : null;
  const variableProperties = variable?.properties || {};

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {Object.entries(variableProperties).map(([key, property]) => (
          <Fragment key={key}>
            <Typography variant="h6">{property.title}</Typography>
            {!!jobVariables[key] && <ul>{renderInput(jobVariables[key])}</ul>}
          </Fragment>
        ))}
      </DialogContent>
    </Dialog>
  );
};
