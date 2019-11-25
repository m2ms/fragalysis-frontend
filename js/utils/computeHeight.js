import { memo, useCallback, useEffect, useRef } from 'react';

export const ComputeHeight = memo(({ componentRef, height, setHeight }) => {
  const registerResize = useRef(false);
  const resize = useCallback(() => {
    const newHeight =
      componentRef !== undefined && componentRef !== null && componentRef.offsetHeight
        ? componentRef.offsetHeight
        : null;
    if (newHeight !== null && newHeight !== height) {
      setHeight(newHeight);
    }
  }, [componentRef, height, setHeight]);

  useEffect(() => {
    const registeringResize = registerResize.current;
    if (componentRef !== undefined && componentRef !== null && registeringResize === false) {
      window.addEventListener('resize', resize, false);
      registerResize.current = true;
      resize();
    }
    return () => {
      window.removeEventListener('resize', resize, false);
    };
  }, [resize, componentRef]);

  return null;
});
