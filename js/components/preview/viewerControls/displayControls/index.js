import React, { useContext, useEffect, useRef, memo } from 'react';
import { Drawer } from '../../../common/Navigation/Drawer';
import { GridLegacy as Grid, IconButton, Select } from '@mui/material';
import { makeStyles } from '../../../../ui/styles';
import { Edit, Visibility, Delete, VisibilityOff, Add } from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { NglContext } from '../../../nglView/nglProvider';
import {
  addComponentRepresentation,
  removeComponentRepresentation,
  updateComponentRepresentation,
  updateComponentRepresentationVisibility,
  updateComponentRepresentationVisibilityAll,
  changeComponentRepresentation
} from '../../../../reducers/ngl/actions';
import { deleteObject, checkRemoveFromDensityList } from '../../../../reducers/ngl/dispatchActions';
import { MOL_REPRESENTATION, OBJECT_TYPE, SELECTION_TYPE } from '../../../nglView/constants';
import { EditRepresentationMenu } from './editRepresentationMenu';
import { VirtualDisplayTree, representationRowId, sortedRepresentations } from './VirtualDisplayTree';
import { hideShapeRepresentations } from '../../../nglView/redux/dispatchActions';

const EMPTY_OBJECTS = {};

const useStyles = makeStyles(theme => ({
  itemRow: {
    height: theme.spacing(3)
  },
  objectName: {
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1
  }
}));

export default memo(({ open, onClose }) => {
  const classes = useStyles();
  const dispatch = useDispatch();
  // Keep the tree mounted to retain its controls, but do not subscribe it to incoming loads while hidden.
  const currentObjects =
    useSelector(state => (open ? state.nglReducers.objectsInView : EMPTY_OBJECTS)) || EMPTY_OBJECTS;
  const retainedObjects = useRef(EMPTY_OBJECTS);
  if (open) retainedObjects.current = currentObjects;
  const objectsInView = open ? currentObjects : retainedObjects.current;
  const { getViewerAdapter } = useContext(NglContext);

  const [editor, setEditor] = React.useState(null);

  const openRepresentationEditMenu = (event, row) => {
    setEditor({ id: row.id, parentKey: row.parentKey, anchor: event.currentTarget });
  };

  const closeRepresentationEditMenu = () => setEditor(null);

  const changeVisibility = (representation, parentKey) => {
    const viewerAdapter = getViewerAdapter(objectsInView[parentKey].display_div);
    const component = viewerAdapter.getObject(parentKey);
    const representationElement = viewerAdapter.getRepresentation(component, representation);

    if (representationElement) {
      const newVisibility = !viewerAdapter.getVisibility(representationElement);
      representation.params.visible = newVisibility;
      dispatch(updateComponentRepresentation(parentKey, representation.uuid, representation, '', true));
      dispatch(updateComponentRepresentationVisibility(parentKey, representation.uuid, representation, newVisibility));
      viewerAdapter.setVisibility(representationElement, newVisibility);
    }

    hideShapeRepresentations(representationElement, viewerAdapter, parentKey);
  };
  const changeMolecularRepresentation = async (representation, parentKey, e) => {
    const newRepresentationType = e.target.value;
    const oldRepresentation = JSON.parse(JSON.stringify(representation));
    const viewerAdapter = getViewerAdapter(objectsInView[parentKey].display_div);
    const component = viewerAdapter.getObject(parentKey);

    try {
      const newRepresentation = viewerAdapter.createRepresentation(
        component,
        newRepresentationType,
        oldRepresentation.params,
        oldRepresentation.lastKnownID
      );
      await newRepresentation.ready;
      dispatch(addComponentRepresentation(parentKey, newRepresentation, true));
      removeRepresentation(representation, parentKey, true);
      dispatch(changeComponentRepresentation(parentKey, oldRepresentation, newRepresentation));
    } catch (error) {
      console.error(error);
    }
  };

  const addMolecularRepresentation = async (parentKey, e) => {
    e.stopPropagation();
    const viewerAdapter = getViewerAdapter(objectsInView[parentKey].display_div);
    const component = viewerAdapter.getObject(parentKey);

    try {
      const newRepresentation = viewerAdapter.createRepresentation(component, MOL_REPRESENTATION.axes);
      await newRepresentation.ready;
      dispatch(addComponentRepresentation(parentKey, newRepresentation));
    } catch (error) {
      console.error(error);
    }
  };

  const removeRepresentation = (representation, parentKey, skipTracking) => {
    const viewerAdapter = getViewerAdapter(objectsInView[parentKey].display_div);
    const component = viewerAdapter.getObject(parentKey);
    const foundedRepresentation = viewerAdapter.getRepresentation(component, representation);
    if (foundedRepresentation) {
      // update in nglView
      viewerAdapter.removeRepresentation(component, foundedRepresentation);
      // update in redux
      const targetObject = objectsInView[parentKey];

      if (viewerAdapter.getRepresentationCount(component) === 0) {
        // remove from nglReducer and selectionReducer
        dispatch(deleteObject(targetObject, viewerAdapter, true));
      } else {
        hideShapeRepresentations(foundedRepresentation, viewerAdapter, parentKey);
        dispatch(removeComponentRepresentation(parentKey, representation, skipTracking));
      }
    }
  };

  // Removing with Cascade
  const removeMoleculeWithRepresentations = (parentKey, e) => {
    e.stopPropagation();
    const targetObject = objectsInView[parentKey];
    const viewerAdapter = getViewerAdapter(objectsInView[parentKey].display_div);
    const component = viewerAdapter.getObject(parentKey);
    viewerAdapter
      .getRepresentations(component)
      .forEach(representation => dispatch(removeComponentRepresentation(parentKey, representation, true)));

    let deleteFromSelections =
      targetObject.selectionType !== SELECTION_TYPE.DENSITY ||
      dispatch(checkRemoveFromDensityList(targetObject, objectsInView));

    // remove from nglReducer and selectionReducer
    dispatch(deleteObject(targetObject, viewerAdapter, deleteFromSelections));
  };

  // ChangeVisibility with cascade
  const changeVisibilityMoleculeRepresentations = (parentKey, e) => {
    e.stopPropagation();
    const representations = (objectsInView[parentKey] && objectsInView[parentKey].representations) || [];
    const viewerAdapter = getViewerAdapter(objectsInView[parentKey].display_div);
    const component = viewerAdapter.getObject(parentKey);
    let newVisibility = false;
    representations.forEach((representation, index) => {
      if (index === 0) {
        newVisibility = !representation.params.visible;
      }

      const representationElement = viewerAdapter.getRepresentation(component, representation);
      if (representationElement) {
        representation.params.visible = newVisibility;
        viewerAdapter.setVisibility(representationElement, newVisibility);
        dispatch(updateComponentRepresentation(parentKey, representation.uuid, representation, '', true));
      }

      hideShapeRepresentations(representationElement, viewerAdapter, parentKey);
    });

    dispatch(updateComponentRepresentationVisibilityAll(parentKey, newVisibility));
  };

  const hasAllRepresentationVisibled = parentKey => {
    const representations = (objectsInView[parentKey] && objectsInView[parentKey].representations) || [];
    let countOfNonVisibled = 0;

    representations.forEach(r => {
      if (r.params && r.params.visible === false) {
        countOfNonVisibled++;
      }
    });
    return countOfNonVisibled !== representations.length;
  };

  const renderRepresentation = row => {
    const { representation, parentKey: item } = row;
    return (
      <Grid
        container
        justifyContent="space-between"
        direction="row"
        wrap="nowrap"
        alignItems="center"
        className={classes.itemRow}
      >
        <Grid item xs={6}>
          <Select
            native
            value={representation.type}
            inputProps={{ 'aria-label': `Representation type for ${objectsInView[item].name}` }}
            onChange={e => changeMolecularRepresentation(representation, item, e)}
          >
            {Object.keys(MOL_REPRESENTATION).map(option => (
              <option key={MOL_REPRESENTATION[option]} value={MOL_REPRESENTATION[option]}>
                {MOL_REPRESENTATION[option]}
              </option>
            ))}
          </Select>
        </Grid>
        <Grid item xs={6} container justifyContent="flex-end" direction="row" wrap="nowrap">
          <IconButton
            aria-label={`Edit ${representation.type} for ${objectsInView[item].name}`}
            onClick={e => openRepresentationEditMenu(e, row)}
          >
            <Edit />
          </IconButton>
          <IconButton
            aria-label={`Toggle ${representation.type} for ${objectsInView[item].name}`}
            onClick={() => changeVisibility(representation, item)}
          >
            {representation.params?.visible === true ? <Visibility /> : <VisibilityOff />}
          </IconButton>
          <IconButton
            aria-label={`Remove ${representation.type} for ${objectsInView[item].name}`}
            onClick={() => removeRepresentation(representation, item)}
            disabled={
              objectsInView[item].selectionType === SELECTION_TYPE.VECTOR ||
              objectsInView[item].OBJECT_TYPE === OBJECT_TYPE.PROTEIN
            }
          >
            <Delete />
          </IconButton>
        </Grid>
      </Grid>
    );
  };

  const renderObject = ({ parentKey: item }) => (
    <Grid container justifyContent="space-between" direction="row" wrap="nowrap" alignItems="center">
      <Grid item className={classes.objectName} title={objectsInView[item].name}>
        {objectsInView[item].name}
      </Grid>
      <Grid item>
        <IconButton
          aria-label={`Add representation to ${objectsInView[item].name}`}
          onClick={e => addMolecularRepresentation(item, e)}
        >
          <Add />
        </IconButton>
        <IconButton
          aria-label={`Toggle ${objectsInView[item].name}`}
          onClick={e => changeVisibilityMoleculeRepresentations(item, e)}
        >
          {hasAllRepresentationVisibled(item) ? <Visibility /> : <VisibilityOff />}
        </IconButton>
        <IconButton
          aria-label={`Remove ${objectsInView[item].name}`}
          disabled={
            objectsInView[item].selectionType === SELECTION_TYPE.VECTOR ||
            objectsInView[item].OBJECT_TYPE === OBJECT_TYPE.PROTEIN
          }
          onClick={e => removeMoleculeWithRepresentations(item, e)}
        >
          <Delete />
        </IconButton>
      </Grid>
    </Grid>
  );

  const editedObject = editor && objectsInView[editor.parentKey];
  const editedRepresentation =
    editedObject &&
    sortedRepresentations(editedObject).find(
      (representation, index) => representationRowId(editor.parentKey, representation, index) === editor.id
    );

  useEffect(() => {
    if (open && editor && !editedRepresentation) setEditor(null);
  }, [open, editor, editedRepresentation]);

  return (
    <Drawer title="Display controls" open={open} onClose={onClose}>
      <VirtualDisplayTree
        objects={objectsInView}
        open={open}
        pinnedRowId={editedRepresentation ? editor.id : null}
        renderObject={renderObject}
        renderRepresentation={renderRepresentation}
      />
      {editedRepresentation && (
        <EditRepresentationMenu
          key={editor.id}
          active={open}
          editMenuAnchor={editor.anchor}
          closeRepresentationEditMenu={closeRepresentationEditMenu}
          representation={editedRepresentation}
          parentKey={editor.parentKey}
          displayDiv={editedObject.display_div}
        />
      )}
    </Drawer>
  );
});
