import React, { useState } from 'react';
import Typography from '@material-ui/core/Typography';
import Checkbox from '@material-ui/core/Checkbox';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormGroup from '@material-ui/core/FormGroup';
import Radio from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';
import Slider from '@material-ui/core/Slider';
import { SketchPicker } from 'react-color';
import Box from '@material-ui/core/Box';
import FormLabel from '@material-ui/core/FormLabel';

// A reusable popover content for the Density (D) button with controls
export const DensityButtonPopover = () => {
  const [checked, setChecked] = useState({
    event: true,
    fofc: false,
    twofofc: false
  });
  const [mode, setMode] = useState('surface');
  const [contour, setContour] = useState(1.0);
  const [color, setColor] = useState('#2196f3');

  const handleCheckbox = name => event => {
    setChecked({ ...checked, [name]: event.target.checked });
  };

  const handleMode = event => {
    setMode(event.target.value);
  };

  const handleContour = (event, value) => {
    setContour(value);
  };

  const handleColor = color => {
    setColor(color.hex);
  };

  return (
    <div style={{ padding: 16, minWidth: 240 }}>
      <Typography variant="subtitle1">Density Button Dialog</Typography>
      {/* Density map checkboxes */}
      <Box mt={2} mb={1}>
        <FormLabel component="legend">Density Maps</FormLabel>
        <FormGroup row>
          <FormControlLabel
            control={<Checkbox checked={checked.event} onChange={handleCheckbox('event')} color="primary" />}
            label="Event"
          />
          <FormControlLabel
            control={<Checkbox checked={checked.twofofc} onChange={handleCheckbox('twofofc')} color="primary" />}
            label="2FoFc"
          />
          <FormControlLabel
            control={<Checkbox checked={checked.fofc} onChange={handleCheckbox('fofc')} color="primary" />}
            label="FoFc"
          />
        </FormGroup>
      </Box>
      {/* Mode radio buttons */}
      <Box mb={1}>
        <FormLabel component="legend">Display Mode</FormLabel>
        <RadioGroup row value={mode} onChange={handleMode}>
          <FormControlLabel value="surface" control={<Radio color="primary" />} label="Surface" />
          <FormControlLabel value="wireframe" control={<Radio color="primary" />} label="Wireframe" />
        </RadioGroup>
      </Box>
      {/* Contour slider */}
      <Box mb={1}>
        <FormLabel component="legend">Contour Level</FormLabel>
        <Slider value={contour} onChange={handleContour} min={0.1} max={3.0} step={0.05} valueLabelDisplay="auto" />
      </Box>
      {/* Color picker */}
      <Box mb={1}>
        <FormLabel component="legend">Map Color</FormLabel>
        <SketchPicker color={color} onChange={handleColor} disableAlpha={true} presetColors={[]} />
      </Box>
    </div>
  );
};

export default DensityButtonPopover;
