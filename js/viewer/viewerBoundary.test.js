import fs from 'fs';
import path from 'path';

const jsRoot = path.resolve(__dirname, '..');
const implementationFiles = new Set(['viewer/MoorhenViewerAdapter.js']);

const getJavaScriptFiles = directory =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return getJavaScriptFiles(entryPath);
    }
    return entry.name.endsWith('.js') && !entry.name.endsWith('.test.js') ? [entryPath] : [];
  });

const toRelativePath = filePath => path.relative(jsRoot, filePath).replace(/\\/g, '/');
const stripLineComments = source => source.replace(/\/\/.*$/gm, '');

describe('viewer adapter boundary', () => {
  const files = getJavaScriptFiles(jsRoot);

  it('does not import the removed NGL package', () => {
    const violations = files
      .filter(filePath => /from\s+['"]ngl['"]/.test(fs.readFileSync(filePath, 'utf8')))
      .map(toRelativePath);

    expect(violations).toEqual([]);
  });

  it('keeps direct viewer API calls inside viewer implementations', () => {
    const directViewerApi = [
      /\b(?:stage|newStage)\.(?:loadFile|addComponentFromObject|removeComponent|removeAllComponents|getComponentsByName|setParameters|handleResize|makeImage|dispose)\s*\(/,
      /(?:\.stage|\bstage)\.(?:viewerControls|animationControls|tasks|compList)\b/,
      /\.(?:getComponentsByName|addRepresentation|eachRepresentation)\s*\(/,
      /\b(?:component|comp)\.removeRepresentation\s*\(/
    ];
    const violations = files
      .map(filePath => ({ filePath, source: stripLineComments(fs.readFileSync(filePath, 'utf8')) }))
      .filter(({ source }) => directViewerApi.some(pattern => pattern.test(source)))
      .map(({ filePath }) => toRelativePath(filePath))
      .filter(filePath => !implementationFiles.has(filePath));

    expect(violations).toEqual([]);
  });
});
