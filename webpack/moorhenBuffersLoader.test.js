const fs = require('fs');
const { parse } = require('@babel/parser');
const { transformNativeBufferPublication } = require('./moorhenBuffersLoader');

describe('native buffer publication build bridge', () => {
  it('wraps only the installed representation publication and leaves the installed package untouched', () => {
    expect.hasAssertions();
    const file = require.resolve('moorhen');
    const original = fs.readFileSync(file, 'utf8');
    const transformed = transformNativeBufferPublication(original);
    expect(transformed.split('.publishNativeBuffers(')).toHaveLength(2);
    expect(() => parse(transformed)).not.toThrow();
    expect(fs.readFileSync(file, 'utf8')).toBe(original);
    expect(transformed).not.toContain('//# sourceMappingURL=data:');
  });

  it('rejects absent or ambiguous native publication shapes', () => {
    expect.hasAssertions();
    const shape = name => `class ${name} { buildBuffers() {
      this.parentMolecule.store.dispatch(setDisplayBuffers([...current, ...additions]));
    } }`;
    expect(() => transformNativeBufferPublication('class Other {}')).toThrow('exactly one');
    expect(() => transformNativeBufferPublication(shape('A') + shape('B'))).toThrow('exactly one');
  });
});
