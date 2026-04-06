import { Box, FormControlLabel, FormGroup, Typography } from '@material-ui/core';
import Checkbox from '@material-ui/core/Checkbox';
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

export const ProteinButtonPopover = props => {
  const { currentID, toogleProtein } = props;
  const dispatch = useDispatch();

  const proteinList = useSelector(state => state.selectionReducers.proteinList);
  const artefactsChainList = useSelector(state => state.selectionReducers.artefactsChainList);

  const [checked, setChecked] = useState({
    protein: proteinList.includes(currentID),
    artefact: artefactsChainList.includes(currentID)
  });

  const onToggleProtein = type => event => {
    toogleProtein(false, type);
    setChecked(prev => ({ ...prev, [type]: event.target.checked }));
  };

  return (
    <div style={{ padding: 16, minWidth: 200, minHeight: 150 }}>
      <Typography variant="subtitle1">Protein settings</Typography>
      <FormGroup>
        <FormControlLabel
          control={<Checkbox checked={checked.protein} onChange={onToggleProtein('protein')} color="primary" />}
          label="Show sidechains"
        ></FormControlLabel>
        <FormControlLabel
          control={<Checkbox checked={checked.artefact} onChange={onToggleProtein('artefact')} color="primary" />}
          label="Show artefacts chains"
        ></FormControlLabel>
      </FormGroup>
    </div>
  );
};
export default ProteinButtonPopover;
