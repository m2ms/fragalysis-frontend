import React, { useMemo, useState } from 'react';
import { COLUMN_TYPES } from '../table';
import { TextFilter } from '../table/filters/textFilter';
import { NumericFilter } from '../table/filters/numericFilter';
import { PeerReviewFilter } from '../table/filters/peerReviewFilter';
import { ObservationFilter } from '../table/filters/observationFilter';
import { MoleculeFilter } from '../table/filters/moleculeFilter';
import { useSelector } from 'react-redux';
import { createObservationProjection } from './observationProjection';
import { getAllDisplayedObservationIds } from '../../redux/selectors';
import { DJANGO_CONTEXT } from '../../../../../utils/djangoContext';

export const useFilters = (initialItems, columns, viewConfig = {}, controlledConfig) => {
  const [localFilters, setFilters] = useState({});
  const [localSortings, setSortings] = useState({});
  const filters = controlledConfig?.filters ?? localFilters;
  const sortings = controlledConfig?.sortings ?? localSortings;
  const allStatuses = useSelector(state => state.apiReducers.quality_statuses);
  const displayedObservationIds = useSelector(
    state => viewConfig.getDisplayedObservationIds?.(state) ?? getAllDisplayedObservationIds(state)
  );
  const showDisplayedMolecules = useSelector(
    state => viewConfig.getShowDisplayedMolecules?.(state) ?? state.selectionReducers.showDisplayedMolecules
  );

  const handleColumnFilter = (name, value) => {
    if (controlledConfig) controlledConfig.onFilterChange(name, value);
    else setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleColumnSorting = (name, value) => {
    if (controlledConfig) controlledConfig.onSortingChange(name, value);
    else setSortings(prev => ({ ...prev, [name]: value }));
  };

  const applyFiltersAndSort = useMemo(
    () =>
      createObservationProjection({
        columns,
        filters,
        sortings,
        allStatuses,
        displayedObservationIds,
        showDisplayedMolecules,
        viewConfig,
        userId: DJANGO_CONTEXT.pk
      }),
    [columns, filters, sortings, allStatuses, displayedObservationIds, showDisplayedMolecules, viewConfig]
  );

  const filteredItems = useMemo(() => applyFiltersAndSort(initialItems), [initialItems, applyFiltersAndSort]);

  const getColumnFilter = (type, name) => {
    const controlledProps = controlledConfig ? { controlled: true, value: filters[name], sorting: sortings[name] } : {};
    switch (type) {
      case COLUMN_TYPES.TEXT:
        return (
          <TextFilter
            {...controlledProps}
            name={name}
            onFilterChange={v => handleColumnFilter(name, v)}
            onSortingChange={v => handleColumnSorting(name, v)}
          />
        );
      case COLUMN_TYPES.NUMBER:
      case 'int':
      case 'float':
        return (
          <NumericFilter
            {...controlledProps}
            name={name}
            onFilterChange={v => handleColumnFilter(name, v)}
            onSortingChange={v => handleColumnSorting(name, v)}
          />
        );
      case COLUMN_TYPES.PEER_REVIEW:
        return (
          <PeerReviewFilter
            {...controlledProps}
            onFilterChange={v => handleColumnFilter(name, v)}
            onSortingChange={v => handleColumnSorting(name, v)}
          />
        );
      case COLUMN_TYPES.OBSERVATION:
        return (
          <ObservationFilter
            {...controlledProps}
            viewConfig={viewConfig}
            onFilterChange={v => handleColumnFilter(name, v)}
            onSortingChange={v => handleColumnSorting(name, v)}
          />
        );
      case COLUMN_TYPES.MOLECULE:
        return (
          <MoleculeFilter
            {...controlledProps}
            viewConfig={viewConfig}
            onFilterChange={v => handleColumnFilter(name, v)}
            onSortingChange={v => handleColumnSorting(name, v)}
          />
        );
      default:
        return null;
      // return <DefaultFilter />;
    }
  };

  return { filteredItems, getColumnFilter, applyFiltersAndSort };
};
