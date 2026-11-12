const path = require('path');
const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const transformNativePicking = source => {
  const marker = source.lastIndexOf('//# sourceMappingURL=data:');
  const javascript = marker < 0 ? source : source.slice(0, marker);
  const bridge = JSON.stringify(path.resolve(__dirname, '../js/viewer/nativePicking.js'));
  const edits = [];
  let pickCount = 0;
  let builderCount = 0;
  traverse(parse(javascript), {
    ClassMethod(method) {
      if (method.node.key.name !== 'getAtomFomMouseXY') return;
      method.traverse({
        ForStatement(loop) {
          const right = loop.node.test?.right;
          if (right?.property?.name !== 'length' || right.object?.property?.name !== 'atoms') return;
          const buffer = right.object.object;
          let candidate;
          loop.traverse({
            BinaryExpression(comparison) {
              const { operator, left, right: tolerance } = comparison.node;
              if (operator !== '<' || left.type !== 'MemberExpression' || tolerance.type !== 'Identifier') return;
              const initial = comparison.scope.getBinding(tolerance.name)?.path.node.init;
              if (
                initial?.type !== 'BinaryExpression' ||
                initial.operator !== '*' ||
                initial.left.value !== 3.65 ||
                initial.right.property?.name !== 'zoom'
              )
                return;
              const distance = comparison.scope.getBinding(left.object?.name)?.path.node.init;
              if (distance?.type !== 'CallExpression' || distance.arguments.length !== 3) return;
              const [front, back] = distance.arguments;
              if (front.type !== 'Identifier' || back.type !== 'Identifier') return;
              candidate = { front, back, tolerance };
            }
          });
          if (!candidate) return;
          const { front, back, tolerance } = candidate;
          const atom = loop.node.init?.declarations?.[0]?.id;
          if (atom?.type !== 'Identifier') return;
          const candidates = loop.scope.generateUidIdentifier('moorhenAtomCandidates').name;
          const originalLoop = javascript.slice(loop.node.start, loop.node.end);
          const originalBody = javascript.slice(loop.node.body.start, loop.node.body.end);
          edits.push({
            start: loop.node.start,
            end: loop.node.end,
            text:
              `if (!require(${bridge}).bufferMayContainPickedAtom(this, ` +
              `${javascript.slice(buffer.start, buffer.end)}, ${front.name}, ${back.name}, ${
                tolerance.name
              })) continue;` +
              `{ const ${candidates} = require(${bridge}).getAtomPickCandidates(this, ` +
              `${javascript.slice(buffer.start, buffer.end)}, ${front.name}, ${back.name}, ${tolerance.name}); ` +
              `if (${candidates} === null) ${originalLoop} else for (const ${atom.name} of ${candidates}) ${originalBody} }`
          });
          pickCount++;
        }
      });
    },
    IfStatement(condition) {
      const test = condition.node.test;
      if (test.type !== 'UnaryExpression' || test.operator !== '!' || test.argument.property?.name !== 'isDirty')
        return;
      const body = condition.node.consequent;
      if (
        body.type !== 'ContinueStatement' &&
        !(body.type === 'BlockStatement' && body.body[0]?.type === 'ContinueStatement')
      )
        return;
      if (condition.findParent(parent => parent.isClassMethod())) return;
      const owner = condition.getFunctionParent();
      const argument = owner?.node.params[0];
      if (
        argument?.type !== 'Identifier' ||
        test.argument.object?.object?.name !== argument.name ||
        owner.node.body.type !== 'BlockStatement'
      )
        return;
      const start = owner.node.body.start + 1;
      edits.push({ start, end: start, text: `require(${bridge}).invalidateDirtyPickingBounds(${argument.name});` });
      builderCount++;
    }
  });
  if (pickCount !== 1 || builderCount !== 1)
    throw new Error('Moorhen picking bridge: expected one atom loop and dirty buffer builder');
  return edits
    .sort((left, right) => right.start - left.start)
    .reduce((result, { start, end, text }) => result.slice(0, start) + text + result.slice(end), javascript);
};

module.exports = function(source) {
  // eslint-disable-next-line import/extensions
  if (require('moorhen/package.json').version !== '0.22.7')
    throw new Error('Moorhen picking bridge requires review for this package version');
  return transformNativePicking(source);
};
module.exports.transformNativePicking = transformNativePicking;
