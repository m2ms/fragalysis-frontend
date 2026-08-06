import React from 'react';
import {
  Box,
  Checkbox,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Typography
} from '@mui/material';
import {
  POSE_TRANSFER_ORDERS,
  POSE_TRANSFER_SCHEDULING
} from '../../../constants/poseNavigation';
import RichTooltip from '../../tooltip/RichTooltip';
import { TooltipPathProvider } from '../../tooltip/TooltipPathContext';

export const PoseNavigationConfigPopover = ({ value, onChange }) => (
  <TooltipPathProvider path="navConfig">
    <Box p={2} minWidth={280}>
      <Typography variant="subtitle1">Navigation configuration</Typography>

      <Box mt={2} mb={1}>
        <FormLabel component="legend">Transfer order</FormLabel>
        <RadioGroup
          value={value.transferOrder}
          onChange={event => onChange({ transferOrder: event.target.value })}
        >
          <RichTooltip path="transferOrder.removeFirst" placement="right">
            <FormControlLabel
              value={POSE_TRANSFER_ORDERS.REMOVE_FIRST}
              control={<Radio color="primary" />}
              label="Remove first"
            />
          </RichTooltip>
          <RichTooltip path="transferOrder.addFirst" placement="right">
            <FormControlLabel
              value={POSE_TRANSFER_ORDERS.ADD_FIRST}
              control={<Radio color="primary" />}
              label="Add first"
            />
          </RichTooltip>
        </RadioGroup>
      </Box>

      <Box mt={2} mb={1}>
        <FormLabel component="legend">Scheduling</FormLabel>
        <RadioGroup
          value={value.transferScheduling}
          onChange={event => onChange({ transferScheduling: event.target.value })}
        >
          <RichTooltip path="scheduling.overlapped" placement="right">
            <FormControlLabel
              value={POSE_TRANSFER_SCHEDULING.OVERLAPPED}
              control={<Radio color="primary" />}
              label="Overlapped"
            />
          </RichTooltip>
          <RichTooltip path="scheduling.phased" placement="right">
            <FormControlLabel
              value={POSE_TRANSFER_SCHEDULING.PHASED}
              control={<Radio color="primary" />}
              label="Phased"
            />
          </RichTooltip>
        </RadioGroup>
      </Box>

      <Box mt={2}>
        <RichTooltip path="centerAfterTransfer" placement="right">
          <FormControlLabel
            control={
              <Checkbox
                color="primary"
                checked={value.centerOnDestinationLigandAfterTransfer}
                onChange={event =>
                  onChange({ centerOnDestinationLigandAfterTransfer: event.target.checked })
                }
              />
            }
            label="Center on design pose/virtual observation ligand"
          />
        </RichTooltip>
      </Box>
    </Box>
  </TooltipPathProvider>
);

export default PoseNavigationConfigPopover;
