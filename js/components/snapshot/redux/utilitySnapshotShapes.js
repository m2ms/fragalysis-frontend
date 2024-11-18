import { setCurrentSnapshotTree } from '../../projects/redux/actions';
import { snapshotReducers } from './reducer';

export const SNAPSHOT_VALUES_TO_BE_DELETED = {
  apiReducers: {
    // target_id_list: [],
    legacy_target_id_list: [],
    all_mol_lists: [],
    moleculeTags: [],
    tagList: [],
    categoryList: [],
    lhs_compounds_list: [],
    lhsDataIsLoading: true,
    lhsDataIsLoaded: false,
    rhsDataIsLoading: true,
    rhsDataIsLoaded: false,
    proteinIsLoading: false,
    proteinIsLoaded: false
  },
  nglReducers: {
    objectsInView: {},
    pdbCache: {},
    qualityCache: {},
    nglViewFromSnapshotRendered: false,
    snapshotOrientationApplied: false
  },
  selectionReducers: {
    fragmentDisplayList: [],
    proteinList: [],
    complexList: [],
    surfaceList: [],
    densityList: [],
    densityListCustom: [],
    densityListType: [],
    qualityList: [],
    vectorOnList: [],
    isScrollFiredForLHS: false
  },
  snapshotReducers: {
    openSavingDialog: false
  },
  previewReducers: {
    molecule: {
      imageCache: {}
    }
  },
  datasetsReducers: {
    datasets: [],
    moleculeLists: {},
    scoreDatasetMap: {},
    allInspirations: {},
    ligandLists: {},
    proteinLists: {},
    complexLists: {},
    surfaceLists: {},
    datasetScrolledMap: {},
    isSelectedDatasetScrolled: false
  },
  projectReducers: {
    isProjectModalLoading: false
  }
};

// export const SNAPSHOT_VALUES_TO_BE_DELETED_SWITCHING_SNAPSHOTS = {
//   apiReducers: {
//     // target_id_list: [],
//   },
//   nglReducers: {
//     objectsInView: {},
//     pdbCache: {},
//     qualityCache: {},
//     nglViewFromSnapshotRendered: false,
//     snapshotOrientationApplied: false
//   },
//   selectionReducers: {
//     fragmentDisplayList: [],
//     proteinList: [],
//     complexList: [],
//     surfaceList: [],
//     densityList: [],
//     densityListCustom: [],
//     densityListType: [],
//     qualityList: [],
//     vectorOnList: [],
//     isScrollFiredForLHS: false
//   },
//   previewReducers: {
//     molecule: {
//       imageCache: {}
//     }
//   },
//   datasetsReducers: {
//     ligandLists: {},
//     proteinLists: {},
//     complexLists: {},
//     surfaceLists: {},
//     datasetScrolledMap: {},
//     isSelectedDatasetScrolled: false
//   },
//   projectReducers: {
//     isProjectModalLoading: false
//   }
// };

export const SNAPSHOT_VALUES_NOT_TO_BE_DELETED_SWITCHING_TARGETS = {
  apiReducers: {
    target_id_list: [],
    legacy_target_id_list: [],
    all_mol_lists: [],
    moleculeTags: [],
    tagList: [],
    categoryList: [],
    lhs_compounds_list: []
  },
  datasetsReducers: {
    datasets: [],
    moleculeLists: {},
    scoreDatasetMap: {},
    allInspirations: {}
  },
  projectReducers: {
    currentSnapshot: {},
    currentSnapshotList: [],
    currentSnapshotTree: {},
    currentProject: {}
  }
};
