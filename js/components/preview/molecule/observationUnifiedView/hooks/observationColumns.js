import { COLUMN_TYPES } from '../table/constants';

export const getObservationColumns = (viewConfig, extraColumns) => {
  if (!extraColumns?.length) return viewConfig.getColumnsWithoutExtras();
  const columns = viewConfig.getBaseColumns();
  extraColumns.forEach(column => {
    if (!columns.some(item => item.name === column.name)) {
      columns.push({
        name: column.result_property,
        displayName: column.result_property,
        type:
          column.data_type === 'text'
            ? COLUMN_TYPES.TEXT
            : ['float', 'integer'].includes(column.data_type)
            ? COLUMN_TYPES.NUMBER
            : COLUMN_TYPES.CUSTOM,
        visible: column.visible,
        minWidth: 50,
        width: 54,
        resizable: true,
        data_type: column.data_type
      });
    }
  });
  return columns;
};
