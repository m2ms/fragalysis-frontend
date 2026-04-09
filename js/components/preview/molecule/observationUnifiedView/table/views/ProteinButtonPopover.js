import { FormControlLabel, FormGroup, Typography } from '@material-ui/core';
import Checkbox from '@material-ui/core/Checkbox';
import React from 'react';
import { useDispatch } from 'react-redux';

export const ProteinButtonPopover = props => {
  const { toogleProtein, proteinSettings, setProteinSettings } = props;
  const dispatch = useDispatch();

  const onToggleProtein = type => event => {
    toogleProtein(undefined, type);
    setProteinSettings(prev => ({ ...prev, [type]: event.target.checked }));
  };

  return (
    <div style={{ padding: 16, minWidth: 200, minHeight: 150 }}>
      <Typography variant="subtitle1">Protein settings</Typography>
      <FormGroup>
        <FormControlLabel
          control={<Checkbox checked={proteinSettings.protein} onChange={onToggleProtein('protein')} color="primary" />}
          label="Show sidechains"
        ></FormControlLabel>
        <FormControlLabel
          control={
            <Checkbox checked={proteinSettings.artefact} onChange={onToggleProtein('artefact')} color="primary" />
          }
          label="Show artefacts chain"
        ></FormControlLabel>
      </FormGroup>
    </div>
  );
};
export default ProteinButtonPopover;
