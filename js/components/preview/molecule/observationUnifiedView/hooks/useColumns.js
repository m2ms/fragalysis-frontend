import { useEffect, useRef, useState } from 'react';
import { getObservationColumns } from './observationColumns';
import { useSelector } from 'react-redux';
import { LHS_OBSERVATION_VIEW_CONFIG } from '../viewConfigs';

const TABLE_WIDTH_RESERVE = 10;

export const useColumns = (
  defaultWidth,
  viewConfig = LHS_OBSERVATION_VIEW_CONFIG,
  availableWidth = 0,
  preferredDetailWidth = 0
) => {
  const [columns, setColumns] = useState([]);
  const userResizedColumnsRef = useRef(new Set());
  const extraColumns = useSelector(state => state.apiReducers.lhs_extra_columns);

  useEffect(() => {
    userResizedColumnsRef.current = new Set();
    setColumns(getObservationColumns(viewConfig, extraColumns));
  }, [extraColumns, viewConfig]);

  useEffect(() => {
    if (!availableWidth || userResizedColumnsRef.current.has('detail')) {
      return;
    }

    setColumns(currentColumns => {
      const detailColumn = currentColumns.find(column => column.name === 'detail' && column.visible);

      if (!detailColumn) {
        return currentColumns;
      }

      const otherVisibleColumnsWidth = currentColumns.reduce((width, column) => {
        if (!column.visible || column.name === 'detail') {
          return width;
        }

        return width + (column.width || defaultWidth);
      }, 0);
      const maxDetailWidth = Math.floor(availableWidth - otherVisibleColumnsWidth - TABLE_WIDTH_RESERVE);
      const nextDetailWidth = Math.max(
        detailColumn.minWidth || defaultWidth,
        Math.min(maxDetailWidth, preferredDetailWidth || maxDetailWidth)
      );

      if (nextDetailWidth === detailColumn.width) {
        return currentColumns;
      }

      return currentColumns.map(column => (column.name === 'detail' ? { ...column, width: nextDetailWidth } : column));
    });
  }, [availableWidth, defaultWidth, preferredDetailWidth]);

  const handleColumnResize = (name, widthChange) => {
    widthChange = Math.floor(widthChange);
    const updateColumns = [...columns];

    const foundColumnIndex = updateColumns.findIndex(column => column.name === name);
    if (foundColumnIndex === -1) {
      return;
    }

    if (updateColumns[foundColumnIndex].width + widthChange < updateColumns[foundColumnIndex].minWidth) {
      widthChange = updateColumns[foundColumnIndex].minWidth - updateColumns[foundColumnIndex].width;
    }

    updateColumns[foundColumnIndex].width += widthChange;
    userResizedColumnsRef.current.add(name);
    setColumns(updateColumns);
  };

  const getColumnWidth = name => {
    const foundColumn = columns.find(column => column.name === name);

    if (foundColumn) {
      return foundColumn.width;
    } else {
      return defaultWidth;
    }
  };

  return { columns, setColumns, handleColumnResize, getColumnWidth };
};
