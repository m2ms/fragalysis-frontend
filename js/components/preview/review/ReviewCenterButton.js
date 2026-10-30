import React, { useContext } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { IconButton } from '../../../ui';
import { MyLocation } from '../../../ui/icons';
import { NglContext } from '../../nglView/nglProvider';
import { OBJECT_TYPE } from '../../nglView/constants';
import { VIEWS } from '../../../constants/constants';
import { centerOnLigandByMoleculeID } from '../../../reducers/ngl/dispatchActions';
import RichTooltip from '../../tooltip/RichTooltip';
import { TooltipPathProvider } from '../../tooltip/TooltipPathContext';
import { useReviewLigand } from './ReviewLigandProvider';

const getLigandName = (state, item) => {
  const matches = Object.entries(state.nglReducers?.objectsInView || {}).filter(
    ([name, object]) =>
      object &&
      String(object.moleculeId) === String(item.id) &&
      (!object.display_div || object.display_div === VIEWS.MAJOR_VIEW) &&
      (object.OBJECT_TYPE === OBJECT_TYPE.LIGAND || (!object.OBJECT_TYPE && name.includes('_LIGAND'))) &&
      object.representations?.some(
        representation => representation && representation.visible !== false && representation.params?.visible !== false
      )
  );
  const globalName = `${item.observation.code || item.observation.virtual_name}_${OBJECT_TYPE.LIGAND}`;
  return (matches.find(([name]) => name === globalName) || matches[0])?.[0];
};

export const ReviewCenterButton = ({ item }) => {
  const dispatch = useDispatch();
  const viewer = useContext(NglContext);
  const stage = viewer?.getViewerAdapter?.(VIEWS.MAJOR_VIEW) || viewer?.getNglView?.(VIEWS.MAJOR_VIEW)?.stage;
  const name = useSelector(state => getLigandName(state, item));
  const { pending = false } = useReviewLigand(item.id);
  return (
    <TooltipPathProvider absolute path="fragalysis.preview.review">
      <RichTooltip path="centerOn">
        <span>
          <IconButton
            size="small"
            aria-label={`Center on ligand for ${item.label}`}
            disabled={!name || !stage || pending}
            sx={{ padding: 0.25 }}
            onClick={() => dispatch(centerOnLigandByMoleculeID(stage, item.observation.id, null, name))}
          >
            <MyLocation sx={{ fontSize: 18 }} />
          </IconButton>
        </span>
      </RichTooltip>
    </TooltipPathProvider>
  );
};
