const { attributeFields } = require('../graphql-sequelize');
const { GraphQLNonNull } = require('graphql');
const { graphqlFormatFieldName: formatFieldName } = require('@pdcalado/perrydl-wasm');

const getPkFieldKey = model => {
  return Object.keys(model.rawAttributes).find(key => {
    const attr = model.rawAttributes[key];
    return attr.primaryKey;
  });
};

const makeCreateArgs = (model, filter = () => true) => {
  const fields = attributeFields(model);
  const pk = getPkFieldKey(model);

  delete fields[pk];
  Object.keys(fields).filter(key => !filter(key)).forEach(key => delete fields[key]);

  return fields;
};

const makeUpdateArgs = (model, filter = () => true) => {
  const fields = attributeFields(model);
  Object.keys(fields).filter(key => !filter(key)).forEach(key => delete fields[key]);

  return Object.keys(fields).reduce((acc, key) => {
    const field = fields[key];

    if (field.type instanceof GraphQLNonNull) {
      field.type = field.type.ofType;
    }

    acc[key] = field;
    return acc;
  }, fields);
};

const makeDeleteArgs = (model, filter = () => true) => {
  const fields = attributeFields(model);
  Object.keys(fields).filter(key => !filter(key)).forEach(key => delete fields[key]);

  const pk = getPkFieldKey(model);

  return { [pk]: fields[pk] };
};

const getOtherKey = (otherName, otherPkey) => {
  return formatFieldName(`${otherName}_${otherPkey}`);
};

const getPolyKeys = (model, otherModel, otherName) => {
  const key = getPkFieldKey(model);
  const otherKey = getPkFieldKey(otherModel);

  if (otherKey === key) {
    return [
      key,
      otherKey,
      getOtherKey(otherName, otherKey),
    ];
  }

  return [key, otherKey, otherKey];
};

const makePolyArgs = (model, otherModel, otherName) => {
  const [key, otherKey, otherKeyFormatted] = getPolyKeys(model, otherModel, otherName);
  const fields = attributeFields(model);
  const otherFields = attributeFields(otherModel);

  return {
    [key]: fields[key],
    [otherKeyFormatted]: otherFields[otherKey],
  };
};

module.exports = {
  getPkFieldKey,
  makeCreateArgs,
  makeUpdateArgs,
  makeDeleteArgs,
  getPolyKeys,
  makePolyArgs,
  getOtherKey
};
