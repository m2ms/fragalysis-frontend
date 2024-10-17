import { deepMerge } from './merge';

export const setDeepValue = (obj, path, value) => {
  const keys = path.split('.');
  const lastKey = keys.pop();
  const lastObj = keys.reduce((obj, key) => (obj[key] = obj[key] || {}), obj);
  lastObj[lastKey] = value;
};

export const getDeepValue = (obj, path) => {
  return path.split('.').reduce((obj, key) => obj[key], obj);
};

export const deepMergeOjects = (a, b) => {
  return deepMerge(a, b);
};

//returns deep value but path is preserved in resulting object shape
export const getDeepValueWithKeys = (obj, path) => {
  const keys = path.split('.');
  return keys.reduce((obj, key) => ({ [key]: obj[key] }), obj);
};

//but this is specific for snapshot so it's not quite universal - at least I think so
export const deepMergeWithPriority = (a, b) => {
  const merge = (a, b) => {
    const keys = Object.keys(b);
    keys.forEach(key => {
      if (a[key] && typeof a[key] === 'object' && b[key] && typeof b[key] === 'object') {
        if (Array.isArray(a[key]) && Array.isArray(b[key])) {
          //   a[key] = [...a[key], ...b[key]];
          a[key] = [...b[key]];
        } else {
          // a[key] = deepMerge(a[key], b[key]);
          if (Object.keys(b[key]).length === 0) {
            a[key] = b[key];
          } else {
            a[key] = merge(a[key], b[key]);
          }
        }
      } else {
        a[key] = b[key];
      }
    });
    return a;
  };

  return merge({ ...a }, b);
};

export const deepClone = obj => {
  return JSON.parse(JSON.stringify(obj));
};

export const deepMergeWithPriorityAndWhiteList = (a, b, whiteList) => {
  const isPathPresentInTheWhiteList = (path, whiteList) => {
    console.log(`isPathPresentInTheWhiteList - path: ${JSON.stringify(path)}`);
    const result = !!path.reduce((obj, key) => obj[key], whiteList);
    console.log(`isPathPresentInTheWhiteList - result: ${result}`);
    return result;
  };
  const merge = (a, b, path) => {
    const keys = Object.keys(b);

    keys.forEach(key => {
      const currentPath = [...path, key];
      if (isPathPresentInTheWhiteList(currentPath, whiteList)) {
        if (a[key] && typeof a[key] === 'object' && b[key] && typeof b[key] === 'object') {
          if (Array.isArray(a[key]) && Array.isArray(b[key]) && isPathPresentInTheWhiteList(currentPath, whiteList)) {
            a[key] = [...b[key]];
          } else {
            if (Object.keys(b[key]).length === 0 && isPathPresentInTheWhiteList(currentPath, whiteList)) {
              a[key] = b[key];
            } else {
              a[key] = merge(a[key], b[key], currentPath);
            }
          }
        } else {
          if (isPathPresentInTheWhiteList(currentPath, whiteList)) {
            a[key] = b[key];
          }
        }
      }
    });

    // currentPath.pop();
    return a;
  };

  return merge({ ...a }, b, []);
};
