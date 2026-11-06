const fs = require('fs');
const { parse } = require('@babel/parser');
const { transformMoorhenModels } = require('./moorhenModelsLoader');

describe('pinned Moorhen Models component build bridge', () => {
  it('wraps exactly the installed Models component without changing the installed package or other code', () => {
    expect.hasAssertions();
    const file = require.resolve('moorhen');
    const original = fs.readFileSync(file, 'utf8');
    const transformed = transformMoorhenModels(original);
    expect(transformed.split('.withDeferredModelsPanel(')).toHaveLength(2);
    expect(transformed.match(/\n\/\/# sourceMappingURL=data:/)).toBeNull();
    expect(() => parse(transformed)).not.toThrow();
    expect(fs.readFileSync(file, 'utf8')).toBe(original);
    const wrapper = /require\("[^"\n]+deferredModelsPanel\.js"\)\.withDeferredModelsPanel\(/;
    const normalized = transformed.replace(wrapper, '');
    expect(normalized.length).toBeLessThan(original.length);
  });

  it('fails visibly for missing or ambiguous native component shapes', () => {
    expect.hasAssertions();
    expect(() => transformMoorhenModels('const other = () => null;')).toThrow('exactly one');
    const component = name => `const ${name} = props => ({modalId: keys.MODELS, headerTitle: 'Models'});`;
    expect(() => transformMoorhenModels(component('a') + component('b'))).toThrow('exactly one');
  });
});
