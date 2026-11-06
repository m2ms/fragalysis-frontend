const path = require('path');
const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;

// Patch only the generated JS entry at build time. Installed JS/WASM/assets stay
// from the same pinned package. Fail visibly if a future package changes shape.
const transformMoorhenModels = source => {
  const marker = source.lastIndexOf('//# sourceMappingURL=data:');
  const javascript = marker < 0 ? source : source.slice(0, marker);
  const ast = parse(javascript);
  const matches = [];
  traverse(ast, {
    ObjectProperty(property) {
      if (property.node.key.name !== 'headerTitle' || property.node.value.value !== 'Models') return;
      const declaration = property.findParent(parent => parent.isVariableDeclarator());
      const modalId = property.parent.properties.find(item => item.key?.name === 'modalId')?.value;
      if (declaration?.node.init?.type === 'ArrowFunctionExpression' && modalId?.type === 'MemberExpression') {
        matches.push({ component: declaration.node.init, modalId });
      }
    }
  });
  if (matches.length !== 1) throw new Error('Moorhen Models UI bridge: expected exactly one native Models panel');
  const { component, modalId } = matches[0];
  const bridge = JSON.stringify(path.resolve(__dirname, '../js/components/moorhenView/deferredModelsPanel.js'));
  const original = javascript.slice(component.start, component.end);
  const id = javascript.slice(modalId.start, modalId.end);
  return (
    javascript.slice(0, component.start) +
    `require(${bridge}).withDeferredModelsPanel(${original}, ${id})` +
    javascript.slice(component.end)
  );
};

module.exports = function(source) {
  // This exact package version is part of the compatibility bridge.
  // eslint-disable-next-line import/extensions
  if (require('moorhen/package.json').version !== '0.22.7') {
    throw new Error('Moorhen Models UI bridge must be reviewed for the installed package version');
  }
  return transformMoorhenModels(source);
};
module.exports.transformMoorhenModels = transformMoorhenModels;
