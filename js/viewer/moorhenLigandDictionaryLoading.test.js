import fs from 'fs';
import { runInNewContext } from 'vm';
import ts from 'typescript';
import { MoorhenMolecule } from 'moorhen';
import MoorhenViewerAdapter from './MoorhenViewerAdapter';
import { isMoleculeInputError } from './moleculeInputErrors';

jest.mock('./contacts/createContactWorker', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('moorhen', () => {
  const action = type => payload => ({ type, payload });
  return {
    MoorhenMolecule: jest.fn(),
    addMolecule: action('addMolecule'),
    showMolecule: action('showMolecule'),
    removeMolecule: action('removeMolecule'),
    setBackgroundColor: action('setBackgroundColor'),
    setAmbient: action('setAmbient'),
    setDiffuse: action('setDiffuse'),
    setSpecular: action('setSpecular'),
    setSpecularPower: action('setSpecularPower'),
    setZoomWheelSensitivityFactor: action('setZoomWheelSensitivityFactor')
  };
});

const deferred = () => {
  let resolve;
  const promise = new Promise(accept => {
    resolve = accept;
  });
  return { promise, resolve };
};

const readTextFile = file =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });

// Execute the installed file/string loaders and missing-monomer resolver, not a
// reimplementation of their ordering. Only worker chemistry and Gemmi are fixtures.
const installedMolecule = fetchDictionary => {
  const bundle = fs.readFileSync(require.resolve('moorhen'), 'utf8');
  const marker = bundle.lastIndexOf('sourceMappingURL=data:');
  const sourceMap = JSON.parse(Buffer.from(bundle.slice(bundle.indexOf('base64,', marker) + 7), 'base64').toString());
  const source =
    sourceMap.sourcesContent[sourceMap.sources.findIndex(name => name.endsWith('/src/utils/MoorhenMolecule.ts'))];
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 }
  });
  const exports = {};
  runInNewContext(compiled.outputText, {
    exports,
    require: name => (name === './utils' ? { readTextFile } : {}),
    fetch: fetchDictionary,
    console: { log: jest.fn(), warn: jest.fn() }
  });
  return exports.MoorhenMolecule;
};

const molfile = (name, bond = 1) =>
  [
    name,
    '  Fragalysis',
    '',
    '  2  1  0  0  0  0  0  0  0  0999 V2000',
    '    5.0000   14.0000    4.0000 C   0  0  0  0  0  0  0  0  0  0  0  0',
    '    6.0000   14.0000    4.0000 O   0  0  0  0  0  0  0  0  0  0  0  0',
    `  1  2  ${bond}  0  0  0  0`,
    'M  END',
    ''
  ].join('\n');

const pdb = name =>
  `HEADER    ${name}\nHETATM    1  C1  UNL A   1       5.000  14.000   4.000  1.00 20.00           C\n`;
const dictionary = name => `data_comp_UNL\n_generated_for ${name}\n`;
const response = result => ({ data: { result: { status: 'Completed', result } } });

const setup = ({ conversionError, missingConversionResult, installDictionary = async () => {} } = {}) => {
  const fetchDictionary = jest.fn(async () => ({ ok: false }));
  const NativeMolecule = installedMolecule(fetchDictionary);
  const molecules = [];
  const coordinates = new Map();
  const dictionaries = new Map();
  let nextMolNo = 0;
  const commandCentre = {
    current: {
      activeMessages: [],
      cootCommand: jest.fn(async ({ command, commandArgs }) => {
        if (command === 'mol_text_to_pdb') {
          if (conversionError) throw conversionError;
          if (missingConversionResult) return response(undefined);
          const name = commandArgs[0].split('\n')[0];
          return response({ first: pdb(name), second: dictionary(name) });
        }
        if (command === 'read_coords_string') {
          const molNo = ++nextMolNo;
          coordinates.set(molNo, commandArgs[0]);
          return response({ first: molNo, second: 'pdb' });
        }
        if (command === 'get_residue_names_with_no_dictionary')
          return response(dictionaries.has(commandArgs[0]) ? [] : ['UNL']);
        if (command === 'read_dictionary_string') {
          await installDictionary(...commandArgs);
          dictionaries.set(commandArgs[1], commandArgs[0]);
        }
        return response(0);
      })
    }
  };
  const store = {
    getState: () => ({ sceneSettings: { backgroundColor: [1, 1, 1, 1] }, generalStates: { useGemmi: false } }),
    dispatch: jest.fn()
  };
  const createMolecule = () => {
    const molecule = Object.assign(Object.create(NativeMolecule.prototype), {
      type: 'molecule',
      molNo: null,
      commandCentre,
      store,
      monomerLibraryPath: '/monomers',
      representations: [],
      defaultBondOptions: {},
      defaultColourRules: [],
      ligandDicts: {},
      setBackgroundColour: jest.fn(),
      updateGemmiStructure: jest.fn(function() {
        this.gemmiStructure = { isDeleted: () => false, delete: jest.fn(), owner: this };
      })
    });
    molecules.push(molecule);
    return molecule;
  };
  MoorhenMolecule.mockImplementation(createMolecule);
  const adapter = new MoorhenViewerAdapter({ commandCentre, glRef: { current: {} }, store });
  const commands = name => commandCentre.current.cootCommand.mock.calls.filter(([call]) => call.command === name);
  return { adapter, commands, coordinates, dictionaries, fetchDictionary, molecules, createMolecule, NativeMolecule };
};

describe('generated ligand dictionaries from MOL files', () => {
  it('classifies the native missing MOL conversion result as a skipped input before registration', async () => {
    expect.hasAssertions();
    const { adapter, commands, molecules } = setup({ missingConversionResult: true });
    const error = await adapter.loadMolecule(molfile('invalid'), { name: 'invalid' }).catch(failure => failure);
    expect(error.message).toMatch(/reading 'first'/);
    expect(isMoleculeInputError(error)).toBe(true);
    expect(commands('read_coords_string')).toHaveLength(0);
    expect(adapter.getObject('invalid')).toBeUndefined();
    expect(molecules[0].molNo).toBeNull();
    expect(Object.prototype.hasOwnProperty.call(molecules[0], 'loadMissingMonomers')).toBe(false);
  });

  it('reproduces redundant UNL fallback requests in the installed unadapted MOL loader', async () => {
    expect.hasAssertions();
    const { createMolecule, commands, fetchDictionary, dictionaries } = setup();
    const molecule = createMolecule();
    await molecule.loadToCootFromFile(new File([molfile('baseline')], 'baseline.mol'));

    expect(fetchDictionary.mock.calls.map(([url]) => url)).toStrictEqual([
      '/monomers/u/UNL.cif',
      'https://raw.githubusercontent.com/MonomerLibrary/monomers/master/u/UNL.cif',
      'https://www.ebi.ac.uk/pdbe/static/files/pdbechem_v2/UNL.cif'
    ]);
    expect(commands('get_residue_names_with_no_dictionary')).toHaveLength(1);
    expect(dictionaries.get(molecule.molNo)).toBe(dictionary('baseline'));
  });

  it('keeps native conversion and distinct per-molecule dictionaries through concurrent MOL and SDF text loads', async () => {
    expect.hasAssertions();
    const { adapter, commands, coordinates, dictionaries, fetchDictionary, NativeMolecule } = setup();
    const first = molfile('single-bond');
    const second = `${molfile('double-bond', 2)}$$$$\n`;
    const [a, b] = await Promise.all([
      adapter.createNativeMolecule(new File([first], 'first.mol'), 'first'),
      adapter.createNativeMolecule(second, 'second.sdf', { fromString: true })
    ]);

    expect(fetchDictionary).not.toHaveBeenCalled();
    expect(commands('get_residue_names_with_no_dictionary')).toHaveLength(0);
    expect(commands('mol_text_to_pdb').map(([call]) => call.commandArgs)).toStrictEqual(
      expect.arrayContaining([
        [first, 'UNL', 10, 100, true, false],
        [second, 'UNL', 10, 100, true, false]
      ])
    );
    expect(coordinates.get(a.molNo)).toBe(pdb('single-bond'));
    expect(coordinates.get(b.molNo)).toBe(pdb('double-bond'));
    expect(dictionaries.get(a.molNo)).toBe(dictionary('single-bond'));
    expect(dictionaries.get(b.molNo)).toBe(dictionary('double-bond'));
    expect(a.molNo).not.toBe(b.molNo);
    expect(a.loadMissingMonomers).toBe(NativeMolecule.prototype.loadMissingMonomers);
    expect(b.loadMissingMonomers).toBe(NativeMolecule.prototype.loadMissingMonomers);
    expect(Object.prototype.hasOwnProperty.call(a, 'loadMissingMonomers')).toBe(false);
    expect(adapter.contactInputs.get(b)).toStrictEqual({ sdf: second });
  });

  it('awaits dictionary installation before registering the molecule or creating its representation', async () => {
    expect.hasAssertions();
    const started = deferred();
    const release = deferred();
    const { adapter, dictionaries, molecules } = setup({
      installDictionary: async () => {
        started.resolve();
        await release.promise;
      }
    });
    const represent = jest.spyOn(adapter, 'initialiseMoleculeRepresentation').mockImplementation(async molecule => {
      expect(dictionaries.get(molecule.molNo)).toBe(dictionary('delayed'));
    });
    const loading = adapter.loadMolecule(molfile('delayed'), { name: 'delayed', fromString: true });
    await started.promise;
    expect(adapter.getObjects('delayed')).toStrictEqual([]);
    expect(represent).not.toHaveBeenCalled();
    expect(dictionaries.size).toBe(0);
    release.resolve();
    await loading;
    expect(adapter.getObject('delayed')).toBe(molecules[0]);
    expect(represent).toHaveBeenCalledTimes(1);
  });

  it.each(['prototype', 'instance'])(
    'restores the %s lookup after conversion failure without registering an object',
    async owner => {
      expect.hasAssertions();
      const error = Object.freeze(new Error('native MOL conversion failed'));
      const { adapter, commands, molecules, createMolecule, NativeMolecule } = setup({ conversionError: error });
      const molecule = createMolecule();
      const lookup = owner === 'instance' ? jest.fn() : NativeMolecule.prototype.loadMissingMonomers;
      if (owner === 'instance') molecule.loadMissingMonomers = lookup;
      MoorhenMolecule.mockImplementationOnce(() => molecule);
      await expect(adapter.loadMolecule(molfile('failed'), { name: 'failed', fromString: true })).rejects.toBe(error);
      expect(isMoleculeInputError(error)).toBe(true);
      expect(molecule.loadMissingMonomers).toBe(lookup);
      expect(Object.prototype.hasOwnProperty.call(molecule, 'loadMissingMonomers')).toBe(owner === 'instance');
      expect(commands('read_coords_string')).toHaveLength(0);
      expect(commands('read_dictionary_string')).toHaveLength(0);
      expect(adapter.getObjects('failed')).toStrictEqual([]);
      expect(adapter.getTaskCount()).toBe(0);
      expect(molecules).toStrictEqual([molecule]);
    }
  );

  it.each(['file', 'string'])(
    'retains normal missing-monomer lookup for a PDB %s during a pending MOL load',
    async format => {
      expect.hasAssertions();
      const started = deferred();
      const release = deferred();
      const { adapter, dictionaries, fetchDictionary, NativeMolecule } = setup({
        installDictionary: async () => {
          started.resolve();
          await release.promise;
        }
      });
      const ligandLoad = adapter.createNativeMolecule(molfile('pending'), 'pending', { fromString: true });
      await started.promise;
      const source = format === 'file' ? new File([pdb('protein')], 'protein.pdb') : pdb('protein');
      const protein = await adapter.createNativeMolecule(source, 'protein', { fromString: true });
      expect(fetchDictionary).toHaveBeenCalledTimes(3);
      expect(protein.loadMissingMonomers).toBe(NativeMolecule.prototype.loadMissingMonomers);
      expect(dictionaries.has(protein.molNo)).toBe(false);
      release.resolve();
      const ligand = await ligandLoad;
      expect(dictionaries.get(ligand.molNo)).toBe(dictionary('pending'));
      expect(ligand.loadMissingMonomers).toBe(NativeMolecule.prototype.loadMissingMonomers);
    }
  );
});
