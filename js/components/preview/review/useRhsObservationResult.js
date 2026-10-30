import { useCallback, useMemo } from 'react';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import { isEqual } from 'lodash';
import { DJANGO_CONTEXT } from '../../../utils/djangoContext';
import { selectJoinedMoleculeListRHS, getAllDisplayedObservationIds } from '../molecule/redux/selectors';
import { searchForObservations } from '../molecule/redux/dispatchActions';
import { getRhsPoseObservation, selectRhsObservationData } from '../molecule/utils/rhsObservations';
import {
  buildObservationViewConfig,
  RHS_OBSERVATION_VIEW_CONFIG
} from '../molecule/observationUnifiedView/viewConfigs';
import { getObservationColumns } from '../molecule/observationUnifiedView/hooks/observationColumns';
import { useRhsObservationOrdering } from './useRhsObservationOrdering';
import { selectActiveRhsObservationIds, selectDisplayedRhsObservationIds } from './rhsReviewRetention';
import {
  getRhsFilterSmileQuery,
  projectRhsObservationResult,
  selectRhsGeneralFilter,
  selectRhsTableState,
  updateRhsTableSetting
} from './rhsObservationResult';

export const RHS_REVIEW_VIEW_CONFIG = buildObservationViewConfig(RHS_OBSERVATION_VIEW_CONFIG, {
  getObservationFilterValues: item =>
    [getRhsPoseObservation(item)?.virtual_name, RHS_OBSERVATION_VIEW_CONFIG.getObservationCode(item)].filter(Boolean),
  getObservationCode: item =>
    getRhsPoseObservation(item)?.virtual_name || RHS_OBSERVATION_VIEW_CONFIG.getObservationCode(item),
  getFilterSmileQuery: getRhsFilterSmileQuery
});
const EMPTY = [];
const selectionKeys = [
  'proteinList',
  'complexList',
  'fragmentDisplayList',
  'surfaceList',
  'densityList',
  'vectorOnList',
  'molForTagEdit',
  'moleculesToEdit',
  'isGlobalEdit'
];

export const useRhsObservationResult = () => {
  const dispatch = useDispatch();
  const data = useSelector(selectRhsObservationData);
  const observations = useSelector(selectJoinedMoleculeListRHS);
  const search = useSelector(state => state.previewReducers.molecule.searchStringRHS);
  const searchSettings = useSelector(state => state.selectionReducers.searchSettings);
  const selection = useSelector(
    state => ({
      ...Object.fromEntries(selectionKeys.map(key => [key, state.selectionReducers[key]])),
      filter: selectRhsGeneralFilter(state)
    }),
    shallowEqual
  );
  const extraColumns = useSelector(state => state.apiReducers.lhs_extra_columns);
  const allStatuses = useSelector(state => state.apiReducers.quality_statuses || EMPTY);
  const displayedObservationIds = useSelector(getAllDisplayedObservationIds);
  const displayedIds = useSelector(selectDisplayedRhsObservationIds, shallowEqual);
  const activeIds = useSelector(selectActiveRhsObservationIds, shallowEqual);
  const showDisplayedMolecules = useSelector(RHS_REVIEW_VIEW_CONFIG.getShowDisplayedMolecules);
  // The legacy unified-filter reducer clones unrelated entries too. Keep unchanged RHS settings stable.
  const model = useSelector(selectRhsTableState, isEqual);
  const ordering = useRhsObservationOrdering();
  const columns = useMemo(() => getObservationColumns(RHS_REVIEW_VIEW_CONFIG, extraColumns), [extraColumns]);
  const onFilterChange = useCallback((name, value) => dispatch(updateRhsTableSetting('filters', name, value)), [
    dispatch
  ]);
  const onSortingChange = useCallback((name, value) => dispatch(updateRhsTableSetting('sortings', name, value)), [
    dispatch
  ]);
  const columnFilterConfig = useMemo(() => ({ ...model, onFilterChange, onSortingChange }), [
    model,
    onFilterChange,
    onSortingChange
  ]);
  const result = useMemo(
    () =>
      projectRhsObservationResult({
        data,
        observations,
        search,
        searchSettings,
        selection,
        displayedIds,
        activeIds,
        compare: ordering?.compare,
        searchObservations: (...args) => dispatch(searchForObservations(...args)),
        columnOptions: {
          ...model,
          columns,
          allStatuses,
          displayedObservationIds,
          showDisplayedMolecules,
          viewConfig: RHS_REVIEW_VIEW_CONFIG,
          userId: DJANGO_CONTEXT.pk
        }
      }),
    [
      data,
      observations,
      search,
      searchSettings,
      selection,
      displayedIds,
      activeIds,
      ordering,
      dispatch,
      model,
      columns,
      allStatuses,
      displayedObservationIds,
      showDisplayedMolecules
    ]
  );
  return useMemo(() => ({ ...result, data, ordering, columnFilterConfig }), [
    result,
    data,
    ordering,
    columnFilterConfig
  ]);
};
