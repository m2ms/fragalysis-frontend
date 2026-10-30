import { VIEWS } from '../../../constants/constants';
import { NGL_OBJECTS } from '../../../reducers/ngl/constants';
import { OBJECT_TYPE } from '../../nglView/constants';
import { addLigand, removeLigand } from '../molecule/redux/dispatchActions';
import { appendToBeDisplayedList, updateInToBeDisplayedList } from '../../../reducers/selection/actions';
import { appendToBeDisplayedListForDataset, updateInToBeDisplayedListForDataset } from '../../datasets/redux/actions';
import { copyRepresentationSettingsList } from '../../../viewer/representationState';
import { observeStructureOperation } from '../../../reducers/ngl/structureOperationCompletion';
import { selectRhsObservationData } from '../molecule/utils/rhsObservations';
import { isReviewGroupComplete, isReviewLigandVisible, resolveRhsReviewGroup } from './rhsReviewInspirations';
import { SET_REVIEW_OWNERSHIP, normalizeReviewOwnership } from '../../../constants/reviewSettings';

const sameId = (a, b) => String(a && typeof a === 'object' ? a.id : a) === String(b);
const type = NGL_OBJECTS.LIGAND;
const defaultRepresentations = [
  {
    type: 'licorice',
    params: { colorScheme: 'element', multipleBond: true, radiusSize: 0.11, visible: true }
  }
];
const findIntent = (queue = [], id) => [...queue].reverse().find(item => sameId(item.id, id) && item.type === type);

const ligandPaths = (state, observation) => {
  const base = `${observation.code || observation.virtual_name}_${OBJECT_TYPE.LIGAND}`;
  const objects = Object.values(state.nglReducers.objectsInView || {}).filter(
    object =>
      object &&
      sameId(object.moleculeId, observation.id) &&
      (!object.display_div || object.display_div === VIEWS.MAJOR_VIEW) &&
      (object.OBJECT_TYPE === OBJECT_TYPE.LIGAND || (!object.OBJECT_TYPE && object.name?.includes('_LIGAND')))
  );
  const datasetIds = Object.keys(state.datasetsReducers?.moleculeLists || {});
  return [undefined, ...datasetIds].map(datasetID => {
    const queue =
      datasetID === undefined
        ? state.selectionReducers.toBeDisplayedList
        : state.datasetsReducers.toBeDisplayedList?.[datasetID];
    const selected =
      datasetID === undefined
        ? state.selectionReducers.fragmentDisplayList
        : state.datasetsReducers.ligandLists?.[datasetID];
    const name = datasetID === undefined ? base : `${base}_${datasetID}`;
    return {
      datasetID,
      name,
      intent: findIntent(queue, observation.id),
      selected: selected?.some(value => sameId(value, observation.id)),
      object: objects.find(object => object.name === name)
    };
  });
};

// Owns transient request feedback, not native resources. It lives above the closable/virtualized panel.
export const createReviewLigandController = ({
  store,
  getViewer,
  resolveGroup = resolveRhsReviewGroup,
  timeout = 60000
}) => {
  const listeners = new Set();
  const jobs = new Map();
  // Ownership contains observation IDs, path IDs and flags only. Native objects stay inside the adapter.
  const groups = new Map();
  const releasingGroups = new Set();
  const members = new Map();
  const memberWork = new Map();
  let snapshot = {};
  let generation = 0;
  let unsubscribe;
  let ownDispatch = false;
  let lastOwnership;
  const dispatchOwn = action => {
    ownDispatch = true;
    try {
      return store.dispatch(action);
    } finally {
      ownDispatch = false;
    }
  };
  const emit = () => listeners.forEach(listener => listener());
  const publishOwnership = () => {
    const ownership = normalizeReviewOwnership({
      groups: [...groups].map(([id, required]) => ({
        id,
        members: [...required],
        releasing: releasingGroups.has(id)
      })),
      members: [...members.values()].map(member => ({
        id: member.id,
        code: member.code,
        owned: [...member.owned].map(datasetID => (datasetID === undefined ? null : datasetID)),
        held: [...member.held]
      }))
    });
    if (JSON.stringify(ownership) !== JSON.stringify(lastOwnership)) {
      dispatchOwn({ type: SET_REVIEW_OWNERSHIP, ownership });
    }
  };
  const restoreOwnership = ownership => {
    const saved = normalizeReviewOwnership(ownership);
    saved.members.forEach(member =>
      members.set(member.id, {
        ...member,
        owners: new Set(),
        owned: new Set(member.owned.map(datasetID => (datasetID === null ? undefined : datasetID))),
        held: new Set(member.held)
      })
    );
    saved.groups.forEach(group => {
      groups.set(group.id, new Set(group.members));
      if (group.releasing) releasingGroups.add(group.id);
      group.members.forEach(id => members.get(id).owners.add(group.id));
    });
  };
  const update = (id, value) => {
    snapshot = { ...snapshot, [id]: value };
    emit();
  };
  const reset = () => {
    generation += 1;
    jobs.forEach(job => job.receipts.forEach(receipt => receipt.cancel()));
    jobs.clear();
    groups.clear();
    releasingGroups.clear();
    members.clear();
    memberWork.clear();
    snapshot = {};
    emit();
  };
  const start = () => {
    let target = store.getState().apiReducers.target_on;
    lastOwnership = store.getState().selectionReducers.review?.ligandGroups;
    restoreOwnership(lastOwnership);
    let previousQueues = [
      store.getState().selectionReducers.toBeDisplayedList,
      store.getState().datasetsReducers.toBeDisplayedList
    ];
    unsubscribe = store.subscribe(() => {
      const state = store.getState();
      const next = state.apiReducers.target_on;
      const ownership = state.selectionReducers.review?.ligandGroups;
      const restored = ownership !== lastOwnership;
      lastOwnership = ownership;
      if (next !== target || (!ownDispatch && restored)) {
        target = next;
        reset();
        restoreOwnership(ownership);
      } else if (!ownDispatch) {
        // Observe fresh external rendering intents, including a manual add which joins a pending review load.
        // Render acknowledgements only set rendered:true, so they never acquire an independent hold.
        members.forEach(member => {
          const observation = { id: member.id, code: member.code };
          ligandPaths(state, observation).forEach(path => {
            const previous = findIntent(
              path.datasetID === undefined ? previousQueues[0] : previousQueues[1]?.[path.datasetID],
              member.id
            );
            if (!path.intent || path.intent === previous) return;
            if (path.intent.display === false) member.held.delete(path.name);
            else if (!path.intent.rendered) member.held.add(path.name);
          });
        });
        publishOwnership();
      }
      previousQueues = [state.selectionReducers.toBeDisplayedList, state.datasetsReducers.toBeDisplayedList];
    });
    return () => {
      unsubscribe();
      reset();
    };
  };

  const getMember = (state, observation) => {
    const key = String(observation.id);
    if (!members.has(key)) {
      const paths = ligandPaths(state, observation);
      members.set(key, {
        id: observation.id,
        code: observation.code || observation.virtual_name,
        owners: new Set(),
        owned: new Set(),
        held: new Set(
          paths
            .filter(
              path =>
                (path.object?.representations?.some(
                  repr => repr && repr.visible !== false && repr.params?.visible !== false
                ) &&
                  path.intent?.display !== false) ||
                (path.intent?.display === true && !path.intent.rendered)
            )
            .map(path => path.name)
        )
      });
    }
    return members.get(key);
  };
  const serializeMember = (id, operation) => {
    const key = String(id);
    const promise = Promise.resolve(memberWork.get(key))
      .catch(() => undefined)
      .then(operation);
    memberWork.set(key, promise);
    const clear = () => {
      if (memberWork.get(key) === promise) memberWork.delete(key);
    };
    promise.then(clear, clear);
    return promise;
  };

  const toggle = id => {
    const key = String(id);
    if (jobs.has(key)) return jobs.get(key).promise;
    const job = { generation, receipts: new Set() };
    jobs.set(key, job);
    update(key, { pending: true, error: null });
    const current = () => {
      if (job.generation !== generation) throw new Error('Ligand request belongs to a previous target or snapshot.');
      return store.getState();
    };
    const enqueue = async (path, observation, display, representations) => {
      const receipt = observeStructureOperation(
        store,
        { datasetID: path.datasetID, id: observation.id, type, display },
        timeout
      );
      job.receipts.add(receipt);
      try {
        const state = current();
        const intent =
          path.datasetID === undefined
            ? findIntent(state.selectionReducers.toBeDisplayedList, observation.id)
            : findIntent(state.datasetsReducers.toBeDisplayedList?.[path.datasetID], observation.id);
        if (path.datasetID === undefined) {
          if (!display) {
            if (!intent)
              dispatchOwn(appendToBeDisplayedList({ id: observation.id, type, display: false, withVector: false }));
            else dispatchOwn(removeLigand(getViewer(), observation, true, false));
          } else if (intent?.display === true && !intent.rendered) {
            // Repeated effects join the existing claimed work rather than adding another queue entry.
            dispatchOwn(updateInToBeDisplayedList({ id: observation.id, type, display: true }));
          } else {
            dispatchOwn(addLigand(getViewer(), observation, undefined, false, false, true, representations));
          }
        } else {
          const item =
            display && intent?.display === true && !intent.rendered
              ? { ...intent, datasetID: path.datasetID }
              : {
                  id: observation.id,
                  datasetID: path.datasetID,
                  type,
                  display,
                  center: false,
                  ...(display ? { representations } : {})
                };
          dispatchOwn(
            intent
              ? updateInToBeDisplayedListForDataset(path.datasetID, item)
              : appendToBeDisplayedListForDataset(path.datasetID, item)
          );
        }
        await receipt.promise;
        current();
      } finally {
        receipt.cancel();
        job.receipts.delete(receipt);
      }
    };
    const observationFor = member => {
      const state = current();
      return (
        state.apiReducers.all_mol_lists?.find(obs => sameId(obs.id, member.id)) ||
        selectRhsObservationData(state).observations.find(obs => sameId(obs.id, member.id))
      );
    };
    const ensureVisible = async member => {
      const state = current();
      const observation = observationFor(member);
      if (!observation) throw new Error('The ligand observation is unavailable.');
      const paths = ligandPaths(state, observation);
      const existing = paths.filter(path => path.object || path.selected || path.intent);
      if (isReviewLigandVisible(state, observation) && !existing.some(path => path.intent?.display === false)) return;
      // Reuse detached appearance settings, including a previous removal's cache. Never copy native handles/UUIDs.
      const cached = paths
        .map(path => path.object || state.nglReducers.objectsInViewStash?.[path.name])
        .find(object => object?.representations?.length);
      const representations = copyRepresentationSettingsList(
        cached?.representations || defaultRepresentations
      ).map(representation => ({ ...representation, params: { ...representation.params, visible: true } }));
      const occupied = existing.filter(
        path =>
          path.object ||
          path.intent?.display === false ||
          (path.selected && !(path.intent?.display === true && !path.intent.rendered))
      );
      await Promise.all(occupied.map(path => enqueue(path, observation, false)));
      const latest = current();
      const globalObservation = latest.apiReducers.all_mol_lists?.find(obs => sameId(obs.id, member.id));
      const path =
        existing.find(item => item.intent?.display === true && !item.intent.rendered && !occupied.includes(item)) ||
        (globalObservation
          ? paths[0]
          : paths.find(
              item =>
                item.datasetID !== undefined &&
                latest.datasetsReducers.moleculeLists[item.datasetID]?.some(item => sameId(item, member.id))
            ));
      if (!path) throw new Error('The ligand has no available data source.');
      if (!member.held.has(path.name)) member.owned.add(path.datasetID);
      publishOwnership();
      await enqueue(path, globalObservation || observation, true, representations);
      if (!isReviewLigandVisible(current(), observation)) throw new Error('The ligand did not become visible.');
    };
    const release = async (member, design = false) => {
      current();
      if (member.owners.size) return;
      const observation = observationFor(member);
      if (!observation) throw new Error('The ligand observation is unavailable.');
      const paths = ligandPaths(current(), observation).filter(
        path =>
          (design || (member.owned.has(path.datasetID) && !member.held.has(path.name))) &&
          (path.object || path.selected || path.intent)
      );
      const results = await Promise.allSettled(paths.map(path => enqueue(path, observation, false)));
      const failed = results.find(result => result.status === 'rejected');
      if (failed) throw failed.reason;
      if (design && isReviewLigandVisible(current(), observation)) throw new Error('The ligand is still displayed.');
      // Kept manual copies no longer belong to Review. A future group recognizes their visible independent hold.
      if (!member.owners.size && members.get(String(member.id)) === member) members.delete(String(member.id));
    };
    job.promise = Promise.resolve()
      .then(async () => {
        const state = current();
        if (!getViewer()) throw new Error('The 3D viewer is not ready.');
        const required = resolveGroup(state, id);
        if (!required.length) throw new Error('The design observation is unavailable.');
        const previous = groups.get(key) || new Set();
        const ids = new Set([...previous, ...required.map(observation => String(observation.id))]);
        required.forEach(observation => getMember(state, observation));
        const complete = isReviewGroupComplete(state, required);
        if (complete || releasingGroups.has(key)) {
          releasingGroups.add(key);
          ids.forEach(memberId => members.get(memberId)?.owners.delete(key));
          publishOwnership();
          const results = await Promise.allSettled(
            [...ids].map(memberId => {
              const member = members.get(memberId);
              return member && serializeMember(memberId, () => release(member, memberId === key));
            })
          );
          current();
          const failed = results.find(result => result.status === 'rejected');
          if (failed) {
            // Retain the remaining cleanup responsibility; no failed release is acknowledged as a complete group.
            ids.forEach(memberId => members.get(memberId)?.owners.add(key));
            groups.set(key, new Set([...ids].filter(memberId => members.has(memberId))));
            throw failed.reason;
          }
          groups.delete(key);
          releasingGroups.delete(key);
          return;
        }
        // Claim every member synchronously before awaiting a shared load/removal. Independent groups remain concurrent.
        ids.forEach(memberId => members.get(memberId)?.owners.add(key));
        groups.set(key, ids);
        publishOwnership();
        const results = await Promise.allSettled(
          required.map(observation => {
            const member = members.get(String(observation.id));
            return serializeMember(member.id, () => ensureVisible(member));
          })
        );
        current();
        const failed = results.find(result => result.status === 'rejected');
        if (failed) {
          const added = [...ids].filter(memberId => !previous.has(memberId));
          added.forEach(memberId => members.get(memberId)?.owners.delete(key));
          const cleanup = await Promise.allSettled(
            added.map(memberId => {
              const member = members.get(memberId);
              return member && serializeMember(memberId, () => release(member));
            })
          );
          current();
          const cleanupFailed = cleanup.some(result => result.status === 'rejected');
          const retained = new Set([
            ...previous,
            ...added.filter(memberId => members.has(memberId) && !members.get(memberId).owners.size)
          ]);
          retained.forEach(memberId => members.get(memberId)?.owners.add(key));
          if (retained.size) groups.set(key, retained);
          else groups.delete(key);
          throw new Error(
            `${failed.reason.message || failed.reason}${cleanupFailed ? ' Cleanup also failed; click to retry.' : ''}`
          );
        }
      })
      .catch(error => {
        if (job.generation === generation) update(key, { pending: false, error: error.message || String(error) });
      })
      .finally(() => {
        if (jobs.get(key) === job) {
          jobs.delete(key);
          publishOwnership();
          if (!snapshot[key]?.error) update(key, { pending: false, error: null });
        }
      });
    return job.promise;
  };
  return {
    start,
    toggle,
    subscribe: listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snapshot
  };
};
