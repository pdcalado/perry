const { DATE, TEXT, INTEGER, REAL, NUMERIC, BLOB, literal } = require('sequelize');
const { graphqlFormatFieldName: formatFieldName } = require('@pdcalado/perrydl-wasm');

const transformColumnToType = column => {
  const c = column.toLowerCase();

  if (c.includes('int')) {
    return INTEGER;
  }

  if (c.includes('char') || c === 'clob' || c === 'text') {
    return TEXT;
  }

  if (c.includes('double') || c === 'real' || c === 'float') {
    return REAL;
  }

  if (
    c.includes('decimal') ||
    c.includes('numeric') ||
    c === 'boolean'
  ) {
    return NUMERIC;
  }

  if (c === 'date' ||
    c === 'datetime') {
    return DATE;
  }

  return BLOB;
};

const createDefaultValue = (value) => {
  value === "CURRENT_TIMESTAMP" ? literal("CURRENT_TIMESTAMP") : value
};

const fun = (columns) => {
  return columns.reduce((acc, column) => {
    acc[formatFieldName(column.name)] = {
      type: transformColumnToType(column.type),
      primaryKey: column.pk === 1,
      field: column.name,
      allowNull: column.notnull === 0 || column.dflt_value !== null,
      defaultValue: createDefaultValue(column.dflt_value),
      autoIncrement: column.type === 'INTEGER' && column.pk === 1,
    };

    return acc;
  }, {});
};

module.exports = fun;
