import { captureControlSnapshots } from './poseTransfer';
import { createRhsPoseTransferConfig } from './rhsPoseTransferConfig';

const createState = overrides => ({
  selectionReducers: {
    artefactsChainList: [],
    complexList: [],
    densityList: [],
    fragmentDisplayList: [],
    proteinList: [],
    proteinSettings: [],
    qualityList: [],
    surfaceList: [],
    toBeDisplayedList: [],
    vectorOnList: [],
    ...overrides?.selectionReducers
  },
  nglReducers: {
    objectsInView: {},
    ...overrides?.nglReducers
  },
  apiReducers: {
    all_mol_lists: [],
    ...overrides?.apiReducers
  }
});

const createConfig = () =>
  createRhsPoseTransferConfig({
    getComputedInspirations: ({ data }) => data.computed_inspirations || [],
    ligandRepresentations: [{ type: 'licorice' }]
  });

describe('rhs pose transfer configuration', () => {
  it('captures ligand representations and the quality-rendering flag', () => {
    expect.hasAssertions();
    const config = createConfig();
    const ligand = config.inspirationControls.find(control => control.key === 'ligand');
    const source = { id: 11, code: 'source' };
    const representations = [{ type: 'licorice', params: { colorValue: '#123456' } }];
    const state = createState({
      selectionReducers: {
        fragmentDisplayList: [source.id],
        toBeDisplayedList: [
          {
            id: source.id,
            type: 'LIGAND',
            display: true,
            withQuality: true,
            representations
          }
        ]
      }
    });

    const snapshots = captureControlSnapshots(state, [source], [ligand]);

    expect(snapshots.ligand.customization).toStrictEqual({
      representations,
      withQuality: true
    });
  });

  it('copies protein choices, representations, and render flags from the first active inspiration', () => {
    expect.hasAssertions();
    const config = createConfig();
    const protein = config.inspirationControls.find(control => control.key === 'protein');
    const first = { id: 21, code: 'first' };
    const second = { id: 22, code: 'second' };
    const firstRepresentations = [{ type: 'cartoon', params: { opacity: 0.4 } }];
    const state = createState({
      selectionReducers: {
        proteinList: [first.id, second.id],
        artefactsChainList: [first.id],
        proteinSettings: [
          { id: first.id, protein: true, artefact: true },
          { id: second.id, protein: true, artefact: false }
        ],
        toBeDisplayedList: [
          {
            id: first.id,
            type: 'PROTEIN',
            display: true,
            withQuality: true,
            representations: firstRepresentations
          },
          { id: first.id, type: 'ARTEFACTS', display: true, withQuality: false }
        ]
      }
    });

    const snapshots = captureControlSnapshots(state, [first, second], [protein]);

    expect(snapshots.protein.sourceItem).toBe(first);
    expect(snapshots.protein.customization).toStrictEqual({
      proteinRepresentations: firstRepresentations,
      artefactRepresentations: undefined,
      proteinWithQuality: true,
      artefactWithQuality: false,
      settings: { id: first.id, protein: true, artefact: true }
    });
  });

  it('rewrites density customization for the destination while preserving its appearance', async () => {
    expect.hasAssertions();
    const config = createConfig();
    const density = config.inspirationControls.find(control => control.key === 'density');
    const source = { id: 31, code: 'density-source' };
    const destination = {
      id: 32,
      code: 'density-destination',
      proteinData: { event_info: '/event.ccp4' }
    };
    const densityObject = {
      id: source.id,
      color: '#abcdef',
      contour_event: 1.7,
      isWireframeStyle: false,
      render_event: true
    };
    const representations = [{ type: 'surface', params: { opacity: 0.65 } }];
    const state = createState({
      selectionReducers: {
        densityList: [densityObject],
        toBeDisplayedList: [
          {
            id: source.id,
            type: 'DENSITY',
            display: true,
            densityObject,
            representations
          }
        ]
      }
    });
    const snapshot = captureControlSnapshots(state, [source], [density]).density;
    const actions = [];
    const dispatch = action => {
      if (typeof action === 'function') {
        return action(dispatch, () => state);
      }
      actions.push(action);
      return action;
    };

    await density.apply({ dispatch, target: destination, customization: snapshot.customization });

    expect(actions).toHaveLength(1);
    expect(actions[0].item).toStrictEqual(
      expect.objectContaining({
        id: destination.id,
        type: 'DENSITY',
        representations,
        densityObject: {
          ...densityObject,
          id: destination.id
        }
      })
    );
  });
});
