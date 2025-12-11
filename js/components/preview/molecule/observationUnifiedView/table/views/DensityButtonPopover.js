import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useDispatch, useSelector } from 'react-redux';
import { getCurrentTarget } from '../../../../../../reducers/api/selectors';
import { DENSITY_MAP_TYPES, MAP_RENDERING_MODES } from '../../../utils/constants';
import { getRandomColor } from '../../../utils/color';
import { NGL_OBJECTS } from '../../../../../../reducers/ngl/constants';
import { throttle } from 'lodash';
import { appendToBeDisplayedList, updateInToBeDisplayedList } from '../../../../../../reducers/selection/actions';

export const DensityButtonPopover = ({ mol }) => {
  const dispatch = useDispatch();

  const densityList = useSelector(state => state.selectionReducers.densityList);
  const toBeDisplayedList = useSelector(state => state.selectionReducers.toBeDisplayedList);
  const activeTarget = useSelector(state => getCurrentTarget(state));
  const defaultMapType = activeTarget?.settings?.electron_density_map_type || DENSITY_MAP_TYPES.EVENT;
  const defaultMapRendering = activeTarget?.settings?.electron_density_rendering_mode || MAP_RENDERING_MODES.WIREFRAME;
  const colourToggle = getRandomColor(mol);

  const currentDensity = densityList.find(d => d.id === mol.id);

  const isDensityAvailable = url => {
    if (!url || url.endsWith('None')) {
      return false;
    }
    return true;
  };

  const checkDensity = mapType => {
    const defaultChecked = { render_event: false, render_2FoFc: false, render_FoFc: false };
    if (defaultMapType === DENSITY_MAP_TYPES.EVENT) {
      //this is ugly but more "elegant/clever" way is to unreadable
      if (isDensityAvailable(mol?.proteinData?.event_info)) {
        defaultChecked.render_event = true;
      } else if (isDensityAvailable(mol?.proteinData?.sigmaa_info)) {
        defaultChecked.render_2FoFc = true;
      } else if (isDensityAvailable(mol?.proteinData?.diff_info)) {
        defaultChecked.render_FoFc = true;
      }
    } else if (defaultMapType === DENSITY_MAP_TYPES._2FoFc) {
      if (isDensityAvailable(mol?.proteinData?.sigmaa_info)) {
        defaultChecked.render_2FoFc = true;
      } else if (isDensityAvailable(mol?.proteinData?.event_info)) {
        defaultChecked.render_event = true;
      } else if (isDensityAvailable(mol?.proteinData?.diff_info)) {
        defaultChecked.render_FoFc = true;
      }
    } else if (defaultMapType === DENSITY_MAP_TYPES.FoFC) {
      if (isDensityAvailable(mol?.proteinData?.diff_info)) {
        defaultChecked.render_FoFc = true;
      } else if (isDensityAvailable(mol?.proteinData?.event_info)) {
        defaultChecked.render_event = true;
      } else if (isDensityAvailable(mol?.proteinData?.sigmaa_info)) {
        defaultChecked.render_2FoFc = true;
      }
    } else {
      //unknown type so defaulting first available
      if (isDensityAvailable(mol?.proteinData?.event_info)) {
        defaultChecked.render_event = true;
      } else if (isDensityAvailable(mol?.proteinData?.sigmaa_info)) {
        defaultChecked.render_2FoFc = true;
      } else if (isDensityAvailable(mol?.proteinData?.diff_info)) {
        defaultChecked.render_FoFc = true;
      }
    }
    if (mapType === DENSITY_MAP_TYPES.EVENT) {
      return defaultChecked.render_event;
    } else if (mapType === DENSITY_MAP_TYPES._2FoFc) {
      return defaultChecked.render_2FoFc;
    } else if (mapType === DENSITY_MAP_TYPES.FoFC) {
      return defaultChecked.render_FoFc;
    }
  };

  const [checked, setChecked] = useState({
    render_event: checkDensity(DENSITY_MAP_TYPES.EVENT),
    render_FoFc: checkDensity(DENSITY_MAP_TYPES.FoFC),
    render_2FoFc: checkDensity(DENSITY_MAP_TYPES._2FoFc)
  });

  const [mode, setMode] = useState(
    currentDensity
      ? currentDensity.isWireframeStyle
        ? MAP_RENDERING_MODES.WIREFRAME
        : MAP_RENDERING_MODES.SURFACE
      : defaultMapRendering
  );
  const [contour, setContour] = useState(1.0);
  const [color, setColor] = useState(currentDensity ? currentDensity.color : colourToggle);

  const densityData = mol.proteinData;

  const createDefaultDensityObject = useCallback(
    (representations = undefined) => {
      if (!mol || !mol.id) {
        return {};
      }
      return {
        type: NGL_OBJECTS.DENSITY,
        id: mol.id,
        display: true,
        representations: representations,
        densityData: mol.proteinData,
        densityObject: {
          id: mol.id,
          isWireframeStyle: mode === MAP_RENDERING_MODES.WIREFRAME,
          color: color,
          ...checked
        }
      };
    },
    [mol, mode, color, checked]
  );

  useEffect(() => {
    const existingDensity = densityList.find(d => d.id === mol.id);
    let densityToEdit = null;
    let needsToUpdate = true;
    if (existingDensity) {
      const densityRenderObject = toBeDisplayedList.find(d => d.id === mol.id && d.type === NGL_OBJECTS.DENSITY);
      if (
        densityRenderObject.densityObject.isWireframeStyle === (mode === MAP_RENDERING_MODES.WIREFRAME) &&
        densityRenderObject.densityObject.color === color &&
        densityRenderObject.densityObject.render_event === checked.render_event &&
        densityRenderObject.densityObject.render_2FoFc === checked.render_2FoFc &&
        densityRenderObject.densityObject.render_FoFc === checked.render_FoFc
      ) {
        needsToUpdate = false;
      }
      densityToEdit = { ...existingDensity };
      //hide existing density
      if (needsToUpdate) {
        dispatch(updateInToBeDisplayedList({ ...densityRenderObject, display: false }));
      }
    } else {
      const densityRenderObject = toBeDisplayedList.find(d => d.id === mol.id && d.type === NGL_OBJECTS.DENSITY);
      if (densityRenderObject) {
        needsToUpdate = false;
      }
      densityToEdit = createDefaultDensityObject();
    }

    densityToEdit = {
      ...densityToEdit,
      densityObject: {
        ...densityToEdit.densityObject,
        isWireframeStyle: mode === MAP_RENDERING_MODES.WIREFRAME,
        color: color,
        ...checked
      }
    };
    if (needsToUpdate) {
      if (existingDensity) {
        dispatch(updateInToBeDisplayedList(densityToEdit));
      } else {
        dispatch(appendToBeDisplayedList(densityToEdit));
      }
    }
  }, [
    checked,
    mode,
    contour,
    color,
    createDefaultDensityObject,
    densityList,
    mol.id,
    dispatch,
    mol,
    toBeDisplayedList
  ]);

  const handleCheckbox = name => event => {
    setChecked({ ...checked, [name]: event.target.checked });
  };

  const handleMode = event => {
    setMode(event.target.value);
  };

  const handleContour = (event, value) => {
    setContour(value);
  };

  const throttledHandleColor = useMemo(
    () =>
      throttle(newColor => {
        setColor(newColor.hex);
      }, 100),
    [setColor]
  );

  return (
    <div style={{ padding: 16, minWidth: 240 }}>
      <Typography variant="subtitle1">Density Customization</Typography>
      {/* Density map checkboxes */}
      <Box mt={2} mb={1}>
        <FormLabel component="legend">Density Maps</FormLabel>
        <FormGroup row>
          <FormControlLabel
            control={
              <Checkbox
                checked={checked.render_event}
                onChange={handleCheckbox('render_event')}
                color="primary"
                disabled={
                  !densityData ||
                  !densityData.event_info ||
                  densityData.event_info === '' ||
                  densityData.event_info?.endsWith('None')
                }
              />
            }
            label="Event"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={checked.render_2FoFc}
                onChange={handleCheckbox('render_2FoFc')}
                color="primary"
                disabled={
                  !densityData ||
                  !densityData.sigmaa_info ||
                  densityData.sigmaa_info === '' ||
                  densityData.sigmaa_info?.endsWith('None')
                }
              />
            }
            label="2FoFc"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={checked.render_FoFc}
                onChange={handleCheckbox('render_FoFc')}
                color="primary"
                disabled={
                  !densityData ||
                  !densityData.diff_info ||
                  densityData.diff_info === '' ||
                  densityData.diff_info?.endsWith('None')
                }
              />
            }
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
      {/* <Box mb={1}>
        <FormLabel component="legend">Contour Level</FormLabel>
        <Slider value={contour} onChange={handleContour} min={0.1} max={3.0} step={0.05} valueLabelDisplay="auto" />
      </Box> */}
      {/* Color picker */}
      <Box mb={1}>
        <FormLabel component="legend">Map Color</FormLabel>
        <SketchPicker color={color} onChange={throttledHandleColor} disableAlpha={true} presetColors={[]} />
      </Box>
    </div>
  );
};

export default DensityButtonPopover;
