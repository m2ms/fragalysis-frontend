const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;

// Suppress only provably empty mesh additions. Do not compare arbitrary
// label records: native callers can deliberately refresh mutable label data.
const transformMoorhenLabels = source => {
  const marker = source.lastIndexOf('//# sourceMappingURL=data:');
  const javascript = marker < 0 ? source : source.slice(0, marker);
  const ast = parse(javascript);
  const aliases = new Map();
  traverse(ast, {
    ObjectPattern(pattern) {
      pattern.node.properties.forEach(property => {
        if (['setLabelBuffers', 'setTexturedShapes'].includes(property.key?.name)) {
          aliases.set(property.value.name, property.key.name);
        }
      });
    }
  });
  const actionName = node => {
    if (node.type === 'SequenceExpression') return actionName(node.expressions[node.expressions.length - 1]);
    return node.type === 'Identifier' ? aliases.get(node.name) : node.property?.name;
  };
  const edits = [];
  const counts = { setLabelBuffers: 0, setTexturedShapes: 0 };
  const appendOwners = [];
  traverse(ast, {
    CallExpression(call) {
      const action = actionName(call.node.callee);
      if (!['setLabelBuffers', 'setTexturedShapes'].includes(action)) return;
      const dispatch = call.parentPath;
      if (!dispatch.isCallExpression() || dispatch.node.callee.property?.name !== 'dispatch') return;
      if (call.findParent(parent => parent.isClassMethod())) return;
      const argument = call.node.arguments[0];
      if (
        argument?.type !== 'ArrayExpression' ||
        argument.elements.length !== 2 ||
        !argument.elements.every(element => element?.type === 'SpreadElement')
      )
        return;
      const additions = argument.elements[1].argument;
      if (additions.type !== 'Identifier') return;
      if (call.scope.getBinding(additions.name)?.path.node.init?.type !== 'ArrayExpression') return;
      counts[action]++;
      appendOwners.push(call.getFunctionParent()?.node);
      edits.push({
        start: dispatch.node.start,
        end: dispatch.node.end,
        text: `(${additions.name}.length > 0 ? ${javascript.slice(dispatch.node.start, dispatch.node.end)} : undefined)`
      });
    }
  });
  if (Object.values(counts).some(count => count !== 1) || !appendOwners[0] || appendOwners[0] !== appendOwners[1])
    throw new Error('Moorhen label bridge: expected exactly one native label/texture mesh append pair');
  return edits
    .sort((left, right) => right.start - left.start)
    .reduce((result, { start, end, text }) => result.slice(0, start) + text + result.slice(end), javascript);
};

module.exports = function(source) {
  // eslint-disable-next-line import/extensions
  if (require('moorhen/package.json').version !== '0.22.7') {
    throw new Error('Moorhen label bridge must be reviewed for the installed package version');
  }
  return transformMoorhenLabels(source);
};
module.exports.transformMoorhenLabels = transformMoorhenLabels;
