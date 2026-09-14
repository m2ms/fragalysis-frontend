/** @jest-environment node */
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { runInNewContext } from 'vm';
import ts from 'typescript';
import { vec3, mat3 } from 'gl-matrix';
import { getMoorhenRepresentationStyle } from './moorhenAdapterUtils';

const installedRepresentation = () => {
  const bundle = fs.readFileSync(require.resolve('moorhen'), 'utf8');
  const marker = bundle.lastIndexOf('sourceMappingURL=data:');
  const sourceMap = JSON.parse(Buffer.from(bundle.slice(bundle.indexOf('base64,', marker) + 7), 'base64').toString());
  const load = (suffix, dependencies) => {
    const source = sourceMap.sourcesContent[sourceMap.sources.findIndex(name => name.endsWith(suffix))];
    const compiled = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 }
    });
    const exports = {};
    runInNewContext(compiled.outputText, { exports, require: name => dependencies[name] || {} });
    return exports;
  };
  const utils = load('/src/utils/utils.ts', { 'gl-matrix/vec3': vec3, 'gl-matrix/mat3': mat3 });
  return load('/src/utils/MoorhenMoleculeRepresentation.ts', { './utils': utils }).MoorhenMoleculeRepresentation;
};

describe('native interaction geometry', () => {
  it('draws dashed cylinders between real Coot hydrogen-bond endpoints using the contact control', async () => {
    expect.hasAssertions();
    // Use the pinned package's tutorial and data archive, with the same native
    // initialization as CootWorker. No application target data is checked in.
    const script = `
      const fs = require('fs');
      const path = require('path');
      (async () => {
        const root = JSON.parse(fs.readFileSync(0, 'utf8'));
        const coot = await require(path.join(root, 'moorhen.js'))({ print: () => {}, printErr: () => {} });
        coot.FS.mkdir('/data_tmp');
        coot.FS.writeFile('/data_tmp/data.tar.gz', fs.readFileSync(path.join(root, 'baby-gru/data.tar.gz')));
        coot.unpackCootDataFile('data_tmp/data.tar.gz', true, 'data_tmp/data.tar', '');
        const container = new coot.molecules_container_js(false);
        container.set_use_gemmi(false);
        container.set_max_number_of_threads(2);
        const pdb = fs.readFileSync(path.join(root, 'baby-gru/tutorials/moorhen-tutorial-structure-number-1.pdb'), 'utf8');
        const id = container.read_coords_string(pdb, 'tutorial').first;
        const nativeBonds = container.get_h_bonds(id, '/*/*/*/*', false);
        const bonds = [];
        for (let i = 0; i < nativeBonds.size(); i++) {
          const bond = nativeBonds.get(i);
          bonds.push({ donor: bond.donor, acceptor: bond.acceptor });
        }
        nativeBonds.delete();
        container.close_molecule(id);
        container.delete();
        console.log('INTERACTIONS=' + JSON.stringify(bonds));
        process.exit(0);
      })().catch(error => { console.error(error); process.exit(1); });
    `;
    const output = execFileSync(process.execPath, ['-e', script], {
      input: JSON.stringify(path.resolve(__dirname, '../../node_modules/moorhen/public')),
      encoding: 'utf8',
      timeout: 30000,
      maxBuffer: 4 * 1024 * 1024
    });
    const bonds = JSON.parse(
      output
        .split('\n')
        .find(line => line.startsWith('INTERACTIONS='))
        .slice(13)
    );
    expect(bonds.length).toBeGreaterThan(10);

    // Execute the installed representation's selection, bond and mesh builders;
    // only replace the worker transport with the real result obtained above.
    const NativeRepresentation = installedRepresentation();
    const representation = Object.create(NativeRepresentation.prototype);
    const cootCommand = jest.fn(async () => ({ data: { result: { result: bonds } } }));
    Object.assign(representation, {
      style: getMoorhenRepresentationStyle('contact'),
      cid: '/*/*/*/*',
      parentMolecule: { molNo: 12 },
      commandCentre: { current: { cootCommand } }
    });
    const [mesh] = await representation.getBufferObjects();
    expect(cootCommand).toHaveBeenCalledWith(
      { returnType: 'vector_hbond', command: 'get_h_bonds', commandArgs: [12, '/*/*/*/*', false] },
      false
    );
    const renderedBonds = bonds.filter(({ donor, acceptor }) => {
      const distance = Math.hypot(donor.x - acceptor.x, donor.y - acceptor.y, donor.z - acceptor.z);
      return distance >= 1.9 && distance <= 4;
    });
    const origins = mesh.instance_origins[0][0];
    const sizes = mesh.instance_sizes[0][0];
    const orientations = mesh.instance_orientations[0][0];
    expect(origins).toHaveLength(renderedBonds.length * 3);
    renderedBonds.forEach(({ donor, acceptor }, index) => {
      ['x', 'y', 'z'].forEach((axis, offset) => {
        expect(origins[index * 3 + offset]).toBeCloseTo(donor[axis], 5);
        const end = origins[index * 3 + offset] + orientations[index * 16 + 8 + offset] * sizes[index * 3 + 2];
        expect(end).toBeCloseTo(acceptor[axis], 4);
      });
    });

    // Each triangle lies in a short dash, with real gaps along the cylinder axis.
    const positions = mesh.vert_tri[0][0];
    const indices = mesh.idx_tri[0][0];
    const intervals = [];
    for (let i = 0; i < indices.length; i += 3) {
      const z = indices.slice(i, i + 3).map(index => positions[index * 3 + 2]);
      intervals.push([Math.min(...z), Math.max(...z)]);
    }
    intervals.sort((a, b) => a[0] - b[0]);
    const dashes = [];
    intervals.forEach(([start, end]) => {
      const previous = dashes[dashes.length - 1];
      if (!previous || start > previous[1] + 1e-6) dashes.push([start, end]);
      else previous[1] = Math.max(previous[1], end);
    });
    expect(dashes.length).toBeGreaterThan(1);
    expect(dashes[0][0]).toBeCloseTo(0);
    expect(dashes[dashes.length - 1][1]).toBeCloseTo(1);
    expect(dashes.every(([start, end]) => end - start < 0.2)).toBe(true);
  });
});
