import { appendAndSendTruckingActions } from './dispatchActions';
import { constants } from './constants';
import { findTruckAction } from './trackingActions';

const trackingMiddleware = ({ dispatch, getState }) => next => action => {
  //console.log(`Redux Log:`, action);

  if (action) {
    const state = getState();
    if (action && !action.type.includes(constants.APPEND_ACTIONS_LIST)) {
      let truckAction = findTruckAction(action, state);
      if (truckAction && truckAction != null) {
        dispatch(appendAndSendTruckingActions(truckAction));
      }
    }

    next(action);
  }
};

export default trackingMiddleware;