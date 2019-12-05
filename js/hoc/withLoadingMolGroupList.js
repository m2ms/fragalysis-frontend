/**
 * Created by abradley on 13/03/2018.
 */
import React, { memo, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { connect } from 'react-redux';
import * as listType from '../components/listTypes';
import * as nglActions from '../reducers/ngl/nglActions';
import * as apiActions from '../reducers/api/apiActions';
import { VIEWS } from '../constants/constants';
import { getUrl, loadFromServer } from '../utils/genericList';
import { OBJECT_TYPE } from '../components/nglView/constants';
import { NglContext } from '../components/nglView/nglProvider';
import { setCountOfRemainingMoleculeGroups, decrementCountOfRemainingMoleculeGroups } from '../reducers/ngl/nglActions';

// is responsible for loading molecules list
export const withLoadingMolGroupList = WrappedComponent => {
  const MolGroupList = memo(
    ({
      loadObject,
      target_on,
      group_type,
      setObjectList,
      isStateLoaded,
      setCountOfRemainingMoleculeGroups,
      decrementCountOfRemainingMoleculeGroups,
      ...rest
    }) => {
      const [state, setState] = useState();
      const { getNglView } = useContext(NglContext);
      const list_type = listType.MOLGROUPS;
      const oldUrl = useRef('');
      const setOldUrl = url => {
        oldUrl.current = url;
      };
      const refOnCancel = useRef(false);

      const generateObject = useCallback(
        (data, selected = false) => {
          let sele = '';
          var colour = [0, 0, 1];
          var radius;
          if (data.mol_id.length > 10) {
            radius = 6.0;
          } else if (data.mol_id.length > 5) {
            radius = 4.0;
          } else {
            radius = 2.0;
          }
          if (selected) {
            sele = 'SELECT';
            colour = [0, 1, 0];
          }
          // Move this out of this
          return {
            OBJECT_TYPE: OBJECT_TYPE.SPHERE,
            name: list_type + sele + '_' + +data.id.toString(),
            radius: radius,
            colour: colour,
            coords: [data.x_com, data.y_com, data.z_com]
          };
        },
        [list_type]
      );

      // call redux action for add objects on NGL view
      const afterPush = useCallback(
        data_list => {
          if (data_list) {
            setCountOfRemainingMoleculeGroups(data_list.length);
            data_list.map(data =>
              loadObject(
                Object.assign({ display_div: VIEWS.SUMMARY_VIEW }, generateObject(data)),
                getNglView(VIEWS.SUMMARY_VIEW).stage
              ).then(() => decrementCountOfRemainingMoleculeGroups())
            );
          }
        },
        [
          decrementCountOfRemainingMoleculeGroups,
          generateObject,
          getNglView,
          loadObject,
          setCountOfRemainingMoleculeGroups
        ]
      );

      useEffect(() => {
        if (target_on && !isStateLoaded) {
          let onCancel = () => {};
          loadFromServer({
            url: getUrl({ list_type, target_on, group_type }),
            setOldUrl: url => setOldUrl(url),
            old_url: oldUrl.current,
            afterPush: afterPush,
            list_type,
            setObjectList,
            cancel: onCancel
          }).catch(error => {
            setState(() => {
              throw error;
            });
          });
          refOnCancel.current = onCancel;
        }
        return () => {
          if (refOnCancel.current) {
            refOnCancel.current();
          }
        };
      }, [target_on, group_type, list_type, setObjectList, isStateLoaded, afterPush]);

      return <WrappedComponent {...rest} />;
    }
  );

  function mapStateToProps(state) {
    return {
      group_type: state.apiReducers.present.group_type,
      target_on: state.apiReducers.present.target_on
    };
  }
  const mapDispatchToProps = {
    loadObject: nglActions.loadObject,
    setObjectList: apiActions.setMolGroupList,
    setCountOfRemainingMoleculeGroups: setCountOfRemainingMoleculeGroups,
    decrementCountOfRemainingMoleculeGroups: decrementCountOfRemainingMoleculeGroups
  };
  return connect(mapStateToProps, mapDispatchToProps)(MolGroupList);
};
