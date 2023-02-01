const { graphqlFormatFieldName: formatFieldName } = require('@pdcalado/perrydl-wasm');
const camelcase = require('camelcase');

const FK_SUFFIX_REGEX = /(_id|Id)$/;

const pascalCase = string => {
  const cameled = camelcase(string);
  return cameled.substr(0, 1).toUpperCase() + cameled.substr(1);
};

const formJoinTableAssociations = (a, b, aKey, bKey, table, context) => {
  const { singular, plural } = context;
  return [
    {
      from: a,
      to: b,
      type: 'belongsToMany',
      options: {
        through: table,
        foreignKey: aKey,
        timestamps: false,
        as: {
          singular: pascalCase(singular(b)),
          plural: pascalCase(plural(b)),
        }
      },
    },
    {
      from: b,
      to: a,
      type: 'belongsToMany',
      options: {
        through: table,
        foreignKey: bKey,
        timestamps: false,
        as: {
          singular: pascalCase(singular(a)),
          plural: pascalCase(plural(a)),
        }
      },
    },
  ];
};

const joinTableFromForeignKeys = (
  table,
  foreignKeys,
  context
) => {
  const [{ table: a, from: aKey }, { table: b, from: bKey }] = foreignKeys;
  return formJoinTableAssociations(a, b, aKey, bKey, table, context);
};

const joinTableAssociations = (
  table,
  info,
  foreignKeys,
  context
) => {
  const { singular, plural } = context;
  if (foreignKeys.length) {
    return joinTableFromForeignKeys(table, foreignKeys, context);
  }

  const [a, b] = table.split('_').map(plural);
  const keys = info.map(column => column.name);
  const [aKey] = keys.filter(key => key.indexOf(singular(a)) === 0);
  const [bKey] = keys.filter(key => key.indexOf(singular(b)) === 0);

  return formJoinTableAssociations(a, b, aKey, bKey, table, context);
};

const tableAssociations = (table, info, foreignKeys, { singular, plural }) => {
  const associations = [];
  const fkColumns = foreignKeys.map(({ from }) => from);

  foreignKeys.forEach(({ table: otherTable, from }) => {
    associations.push({
      from: otherTable,
      to: table,
      type: 'hasMany',
      options: {
        foreignKey: formatFieldName(from),
        as: {
          singular: pascalCase(singular(table)),
          plural: pascalCase(plural(table)),
        }
      },
    });

    associations.push({
      from: table,
      to: otherTable,
      type: 'belongsTo',
      options: {
        foreignKey: formatFieldName(from),
      },
    });
  });

  info
    .filter(({ name, pk }) => !pk && !fkColumns.includes(name))
    .filter(({ name }) => {
      return FK_SUFFIX_REGEX.test(name);
    })
    .forEach(column => {
      const root = column.name.replace(FK_SUFFIX_REGEX, '');

      associations.push({
        from: plural(root),
        to: table,
        type: 'hasMany',
        options: {
          foreignKey: formatFieldName(column.name),
          as: {
            singular: pascalCase(singular(table)),
            plural: pascalCase(plural(table)),
          }
        },
      });

      associations.push({
        from: table,
        to: plural(root),
        type: 'belongsTo',
        options: {
          foreignKey: formatFieldName(column.name),
        },
      });
    });

  return associations;
};

module.exports = { joinTableAssociations, tableAssociations };