import React, { lazy, memo, Suspense } from 'react';

const MoorhenView = lazy(() => import('./MoorhenView'));

const ViewerView = memo(props => (
  <Suspense fallback={<div id={props.div_id} data-viewer-engine="moorhen" />}>
    <MoorhenView {...props} />
  </Suspense>
));

ViewerView.displayName = 'ViewerView';

export default ViewerView;
