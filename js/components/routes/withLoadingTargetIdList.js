import React, { memo, useEffect, useRef, useState } from 'react';
import * as listType from '../listTypes';
import { getUrl, loadFromServer } from '../../utils/genericList';
import * as apiActions from '../../reducers/api/apiActions';
import { connect } from 'react-redux';

export const withLoadingTargetList = WrappedComponent => {
  const LoadTargetList = memo(({ setTargetIdList }) => {
    const [state, setState] = useState();
    const oldUrl = useRef('');
    const setOldUrl = url => {
      oldUrl.current = url;
    };

    useEffect(() => {
      const list_type = listType.TARGET;

      loadFromServer({
        url: getUrl({ list_type }),
        setOldUrl: url => setOldUrl(url),
        old_url: oldUrl.current,
        setObjectList: setTargetIdList,
        list_type
      }).catch(error => {
        setState(() => {
          throw error;
        });
      });
    }, [setTargetIdList]);

    return <WrappedComponent />;
  });

  function mapStateToProps(state) {
    return {};
  }
  const mapDispatchToProps = {
    setTargetIdList: apiActions.setTargetIdList
  };
  return connect(mapStateToProps, mapDispatchToProps)(LoadTargetList);
};
