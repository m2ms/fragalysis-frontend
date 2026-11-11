const path = require('path');
const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const transformNativeBufferPublication = source => {
  const marker = source.lastIndexOf('//# sourceMappingURL=data:');
  const javascript = marker < 0 ? source : source.slice(0, marker);
  const matches = [];
  traverse(parse(javascript), {
    ClassMethod(method) {
      if (method.node.key.name !== 'buildBuffers') return;
      method.traverse({
        CallExpression(call) {
          const receiver = call.node.callee.object;
          const array = call.node.arguments[0]?.arguments?.[0];
          if (
            call.node.callee.property?.name === 'dispatch' &&
            receiver?.property?.name === 'store' &&
            receiver.object?.property?.name === 'parentMolecule' &&
            receiver.object.object?.type === 'ThisExpression' &&
            array?.type === 'ArrayExpression' &&
            array.elements.length === 2 &&
            array.elements.every(element => element?.type === 'SpreadElement')
          )
            matches.push({ call: call.node, additions: array.elements[1].argument });
        }
      });
    }
  });
  if (matches.length !== 1) throw new Error('Moorhen buffer bridge: expected exactly one representation publication');
  const { call, additions } = matches[0];
  const bridge = JSON.stringify(path.resolve(__dirname, '../js/viewer/nativeBufferPublication.js'));
  return (
    javascript.slice(0, call.start) +
    `require(${bridge}).publishNativeBuffers(this, ${javascript.slice(additions.start, additions.end)}, ` +
    `() => ${javascript.slice(call.start, call.end)})` +
    javascript.slice(call.end)
  );
};

module.exports = function(source) {
  // eslint-disable-next-line import/extensions
  if (require('moorhen/package.json').version !== '0.22.7') {
    throw new Error('Moorhen buffer bridge must be reviewed for the installed package version');
  }
  return transformNativeBufferPublication(source);
};
module.exports.transformNativeBufferPublication = transformNativeBufferPublication;
