const {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLList,
  GraphQLBoolean,
  GraphQLInputObjectType,
  GraphQLNonNull,
  isNonNullType
} = require('graphql');
const {
  resolver,
  attributeFields,
  defaultListArgs,
  defaultArgs,
} = require('../graphql-sequelize');
const Sequelize = require('sequelize');

const QueryTypes = Sequelize.QueryTypes;

const createDefinitions = require('./definitions');

const camelcase = require('camelcase');

const { joinTableAssociations, tableAssociations } = require('./associations');
const {
  makeCreateArgs,
  makeUpdateArgs,
  makeDeleteArgs,
  getPkFieldKey,
  makePolyArgs,
  getPolyKeys,
  getOtherKey
} = require('./arguments');
const {
  graphqlFormatTypeName,
  graphqlFormatFieldName
} = require('perrydl');

const GenericResponseType = new GraphQLObjectType({
  name: 'GenericResponse',
  fields: {
    success: { type: GraphQLBoolean },
  },
});

const pascalCase = string => {
  const cameled = camelcase(string);
  return cameled.substr(0, 1).toUpperCase() + cameled.substr(1);
};

const findModelKey = (key, models, singular, plural) => {
  if (models[key]) {
    return key;
  }

  const pluralKey = plural(key);

  if (models[pluralKey]) {
    return pluralKey;
  }

  const singularKey = singular(key);

  if (models[singularKey]) {
    return singularKey;
  }

  throw Error(`Model with ${key} does not exist`);
};

const byHashAndIndex = (types, input) => {
  const byIndex = {};
  const byHash = {};

  for (let other of types) {
    const uniques = input.map((obj, index) => [index, obj[other]]).filter(([, obj]) => obj);
    byHash[other] = new Map(uniques.map(u => u[1]).flat().map(o => [JSON.stringify(o), o]));
    byIndex[other] = new Map(uniques);
  }

  return [byHash, byIndex];
};

const findUniquelyReferenced = async (
  byHash,
  {
    models,
    singular,
    plural,
    transaction
  }
) => {
  const otherModelsByHash = {};

  const withTransaction = transaction ? { transaction } : {};

  for (let other in byHash) {
    const found = await Promise.all(
      Array.from(byHash[other].values())
        .map(value => models[plural(other)].findOne({ where: value, ...withTransaction }))
    );

    const notFound = found.findIndex(o => o == null);
    if (notFound >= 0) {
      throw new Error(`${singular(other)}: '${Array.from(byHash[other].keys())[notFound]}' not found`);
    }

    const entries = Array.from(byHash[other].keys()).map((key, index) => [key, found[index]]);

    otherModelsByHash[other] = new Map(entries);
  }

  return otherModelsByHash;
};

// Handle references to OneToMany related objects, by looking them up
// and replacing by primary key in input objects.
// The variable `input` is mutated by this function.
const injectOneToMany = async (
  types,
  input,
  context,
) => {
  const [
    // This object has a Map of hashed related objects to related objects,
    // for each related object type.
    byHash,
    // This object has a Map of input array indexes to related objects,
    // for each related object type.
    byIndex
  ] = byHashAndIndex(types, input);

  const otherModelsByHash = await findUniquelyReferenced(byHash, context);

  const { models, singular, plural } = context;

  for (let other in byIndex) {
    const otherModel = models[plural(other)];
    byIndex[other].forEach((object, index) => {
      const second = otherModelsByHash[other].get(JSON.stringify(object));
      const otherPkey = getPkFieldKey(otherModel);
      const foreignKey = getOtherKey(singular(otherModel.name), otherPkey);
      input[index][foreignKey] = second.get(otherPkey);
    });
  }
};

const bulkSetManyToMany = async (
  created,
  types,
  input,
  context
) => {
  const [
    // This object has a Map of hashed related objects to related objects,
    // for each related object type.
    byHash,
    // This object has a Map of input array indexes to related objects,
    // for each related object type.
    byIndex
  ] = byHashAndIndex(types, input);

  const otherModelsByHash = await findUniquelyReferenced(byHash, context);

  const { singular, plural, transaction, report } = context;

  const withTransaction = transaction ? { transaction } : {};

  const changes = await Promise.all(
    Object.keys(byIndex).map(
      other =>
        Array.from(byIndex[other].entries()).map(
          async ([index, objects]) => {
            const method = `set${pascalCase(plural(other))}`;
            const thingOne = created[index];
            const otherThings = objects.map(obj => otherModelsByHash[other].get(JSON.stringify(obj)));
            return await thingOne[method](otherThings, withTransaction);
          })
    ).flat(2)
  );

  // Report events
  Object.keys(byIndex).forEach(
    other => {
      const ids = Array.from(byIndex[other].entries()).map(
        ([_, objects]) => objects.map(o => o.id)
      ).flat(1);
      ids.length && report(singular(`${other}`), "update", ids);
    }
  );

  return changes;
};

// Prepare related objects to be created afterwards.
// Organize objects to be created by model name.
const reduceHasMany = (
  model,
  created,
  types,
  input,
  context
) => {
  const [
    // This object has a Map of hashed related objects to related objects,
    // for each related object type.
    byHash,
    // This object has a Map of input array indexes to related objects,
    // for each related object type.
    byIndex
  ] = byHashAndIndex(types, input);

  const { singular } = context;

  let byType = {};
  for (let type of Object.keys(byIndex)) {
    byType[type] = Array.from(byIndex[type].keys()).map(index => {
      let thingOne = created[index];
      let idKey = getPkFieldKey(thingOne);
      let pkey = getOtherKey(singular(model.name), idKey);
      return byIndex[type].get(index).map(obj => ({
        ...obj,
        [pkey]: thingOne.get(idKey)
      }));
    }).flat(2);
  }

  return byType;
};

const bulkCreate = async (values, model, context) => {
  if (!values.input.length) {
    return [];
  }

  const input = values.input;
  const related = context.relatedModels[model.name];
  const singular = context.singular;
  const report = context.report;

  // Set foreign keys for OneToMany relations by looking up references,
  // if any. `values.input` is mutated here.
  if (related.toOne.size) {
    try {
      await injectOneToMany(related.toOne, input, context);
    } catch (err) {
      throw new Error(`unique reference error: ${err}\nObjects were not inserted`);
    }
  }

  let created = null;
  try {
    created = await model.bulkCreate(input);
    const ids = created.map(o => o.get("id"));
    ids.length && report(singular(model.name), "create", ids);
    if (created.length !== input.length)
      throw new Error("inserted size is lower than requested");
  } catch (err) {
    throw new Error(`failed to create objects: ${JSON.stringify(err)}`);
  }

  // Set foreign keys for ManyToMany relations by looking up references,
  // if any.
  if (related.toMany.size) {
    try {
      await bulkSetManyToMany(created, related.toMany, input, context);
    } catch (err) {
      throw new Error(`unique reference error: ${err}\nBut objects were inserted`);
    }
  }

  // Create related objects that depend on the objects we've just created.
  if (related.hasMany.size === 0) {
    return created;
  }

  let nested = reduceHasMany(model, created, related.hasMany, input, context);

  if (Object.keys(nested).length === 0)
    return created;

  try {
    await Promise.all(
      Object.keys(nested)
        .map(key =>
          bulkCreate({ input: nested[key] }, context.models[key], context)
        )
    );
  } catch (err) {
    throw new Error(`failed to create "hasMany" objects: ${err}\nBut objects were inserted`);
  }

  return created;
};

const buildSchemaFromDatabase = async (databaseFile, imodel, eventReport) => {
  const db = new Sequelize({
    dialect: 'sqlite',
    storage: databaseFile,
    logging: false,
  });

  const singular = (term) => imodel.singular(term);
  const plural = (term) => imodel.plural(term);
  const formatTypeName = name => graphqlFormatTypeName(singular(name));
  const formatFieldName = name => graphqlFormatFieldName(name);
  // Prevent mutating these fields.
  // We leave them to be DB managed.
  const filterTimestamps = (key) => key !== formatFieldName("created_at") && key !== formatFieldName("updated_at");
  const reportCurry = (request) => (e, v, i) => eventReport(e, v, i, request);

  const models = {};
  let associations = [];

  for (let table of imodel.sqlTableNames()) {
    const [info] = await db.query(`PRAGMA table_info("${table}")`);
    const foreignKeys = await db.query(`PRAGMA foreign_key_list("${table}")`);

    if (imodel.sqlIsRelationTable(table)) {
      associations = associations.concat(
        joinTableAssociations(table, info, foreignKeys, { singular, plural })
      );
    } else {
      const defs = createDefinitions(info, table);
      models[table] = db.define(table, defs, {
        timestamps: false,
        tableName: table
      });

      associations = associations.concat(
        tableAssociations(table, info, foreignKeys, { singular, plural })
      );
    }
  }

  associations.forEach(({ from, to, type, options }) => {
    const key = type === 'belongsTo' ? singular(to) : to;
    const fromKey = findModelKey(from, models, singular, plural);
    const toKey = findModelKey(to, models, singular, plural);
    models[fromKey][key] = models[fromKey][type](models[toKey], options);
  });

  const types = {};
  const mutations = {};
  const queries = {};
  const relatedModels = Object.keys(models).reduce((res, key) => {
    res[key] = {
      toOne: new Set(),
      toMany: new Set(),
      hasMany: new Set(),
    }
    return res;
  }, {});

  associations.forEach(({ from, to, type }) => {
    const ty = type === "hasMany" ? type : (type === "belongsTo" ? "toOne" : "toMany");
    const fromModel = findModelKey(from, models, singular, plural);
    const toModel = findModelKey(to, models, singular, plural);
    relatedModels[fromModel][ty].add(ty === "toOne" ? singular(toModel) : toModel);
  });

  Object.keys(models).forEach(key => {
    const model = models[key];
    const uniqueAttributes = new Set(["id", ...imodel.tableUniqueAttributes(key)]);

    const fieldAssociations = {
      hasMany: associations
        .filter(({ type }) => type === 'hasMany')
        .filter(({ from }) => from === key)
        .map(({ to }) => models[to]),
      belongsTo: associations
        .filter(({ type }) => type === 'belongsTo')
        .filter(({ from }) => from === key)
        .map(({ to }) => models[to]),
      belongsToMany: associations
        .filter(({ type }) => type === 'belongsToMany')
        .map(({ from, to }) => [from, to])
        .filter(sides => sides.includes(key)),
    };

    // Related types
    const related = relatedModels[model.name];

    const type = new GraphQLObjectType({
      name: formatTypeName(model.name),
      fields() {
        const fields = attributeFields(model);

        fieldAssociations.hasMany.forEach(associatedModel => {
          fields[formatFieldName(associatedModel.name)] = {
            type: new GraphQLList(types[associatedModel.name]),
            args: defaultListArgs(model[associatedModel.name]),
            resolve: resolver(model[associatedModel.name]),
          };
        });

        fieldAssociations.belongsTo.forEach(associatedModel => {
          const fieldName = singular(associatedModel.name);
          fields[formatFieldName(fieldName)] = {
            type: types[associatedModel.name],
            resolve: resolver(model[fieldName]),
          };
        });

        fieldAssociations.belongsToMany.forEach(sides => {
          const [other] = sides.filter(side => side !== model.name);
          fields[formatFieldName(other)] = {
            type: new GraphQLList(types[other]),
            resolve: resolver(model[other]),
          };
        });

        return fields;
      },
    });

    types[key] = type;

    queries[formatFieldName(key)] = {
      type: new GraphQLList(type),
      args: defaultListArgs(model),
      resolve: resolver(model),
    };

    queries[singular(formatFieldName(key))] = {
      type,
      args: defaultArgs(model),
      resolve: resolver(model),
    };

    const uniqueRefInput = new GraphQLInputObjectType({
      name: `UniqueRef${type}`,
      fields: makeUpdateArgs(model, filterTimestamps),
    });

    types[`UniqueRef${type}`] = uniqueRefInput;

    const belongsToAsUniqueRef = (fields, associatedModel) => {
      const fieldName = singular(associatedModel.name);
      fields[formatFieldName(fieldName)] = {
        type: types[`UniqueRef${formatTypeName(fieldName)}`],
      };

      // Allow foreign key to be null, so that unique ref may be used.
      const otherKey = getOtherKey(
        singular(associatedModel.name),
        getPkFieldKey(associatedModel)
      );

      if (isNonNullType(fields[otherKey] && fields[otherKey].type))
        fields[otherKey].type = fields[otherKey].type.ofType;
    };

    const belongsToManyAsUniqueRef = (fields, sides) => {
      const [other] = sides.filter(side => side !== model.name);
      fields[formatFieldName(other)] = {
        type: new GraphQLList(new GraphQLNonNull(types[`UniqueRef${types[other]}`])),
      };
    };

    const createNewInput = new GraphQLInputObjectType({
      name: `CreateNew${type}`,
      fields() {
        const fields = makeCreateArgs(model, filterTimestamps);

        fieldAssociations.belongsTo.forEach(associatedModel => belongsToAsUniqueRef(fields, associatedModel));

        fieldAssociations.belongsToMany.forEach(sides => belongsToManyAsUniqueRef(fields, sides));

        fieldAssociations.hasMany.forEach(associatedModel => {
          const fieldName = formatFieldName(plural(associatedModel.name));
          const typeName = formatTypeName(singular(associatedModel.name));
          fields[fieldName] = {
            type: new GraphQLList(new GraphQLNonNull(types[`CreateNew${typeName}`]))
          };
        })

        return fields;
      }
    });

    types[`CreateNew${type}`] = createNewInput;

    const updateInput = new GraphQLInputObjectType({
      name: `Update${type}`,
      fields() {
        const fields = makeUpdateArgs(model, filterTimestamps);
        fieldAssociations.belongsTo.forEach(associatedModel => belongsToAsUniqueRef(fields, associatedModel));

        fieldAssociations.belongsToMany.forEach(sides => belongsToManyAsUniqueRef(fields, sides));

        return fields;
      }
    });

    mutations[`create${type}`] = {
      type,
      args: {
        input: {
          type: new GraphQLNonNull(createNewInput),
        }
      },
      resolve: async (obj, values, info) => {
        const created = await bulkCreate(
          { ...values, input: [values.input] },
          model,
          { models, singular, plural, relatedModels, report: reportCurry(info) }
        );
        return created ? created[0] : created;
      }
    };

    mutations[`bulkCreate${type}`] = {
      type: new GraphQLList(new GraphQLNonNull(type)),
      args: {
        input: {
          type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(createNewInput))),
        }
      },
      resolve: async (obj, values, info) =>
        bulkCreate(
          values,
          model,
          {
            models,
            singular,
            plural,
            relatedModels,
            report: reportCurry(info),
          }
        )
    };

    mutations[`update${type}`] = {
      type,
      args: {
        input: {
          type: new GraphQLNonNull(updateInput),
        },
        lock: {
          type: updateInput,
        }
      },
      resolve: async (obj, values, info) => {
        const pkKey = getPkFieldKey(model);

        const input = values.input;
        const lock = values.lock;

        const thing = await model.findOne({
          where: { [pkKey]: input[pkKey] },
        });

        if (lock) {
          Object.keys(lock).forEach(key => {
            if (thing[key] !== lock[key])
              throw Error(`optimistic locking failed with differing values for field '${key}': ${thing[key]} !== ${lock[key]}`);
          });
        }

        await thing.update(input);

        return thing;
      },
    };

    mutations[`bulkUpdate${type}`] = {
      type: new GraphQLList(new GraphQLNonNull(type)),
      args: {
        input: {
          type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(updateInput))),
        }
      },
      resolve: async (obj, values, info) => {
        const input = values.input;
        const uniqueRefs = input.map(obj => Object.keys(obj).filter(key => uniqueAttributes.has(key)).reduce((res, key) => {
          res[key] = obj[key];
          return res;
        }, {}));

        // Start a transaction
        return await db.transaction(async (t) => {
          const items = await Promise.all(uniqueRefs.map(ref => model.findOne({ where: ref }, { transaction: t })));

          const notFound = items.map((obj, index) => obj === null ? uniqueRefs[index] : null).filter(obj => obj);
          if (notFound.length > 0) {
            throw Error(`some objects were not found: ${JSON.stringify(notFound)}`);
          }

          const context = {
            models,
            singular,
            plural,
            transaction: t,
            report: reportCurry(info)
          };

          // Update related objects (in one to many associations) if any.
          // Set foreign keys for OneToMany relations by looking up references.
          // `input` is mutated here.
          const injectInput = !related.toOne.size ?
            Promise.resolve() :
            injectOneToMany(related.toOne, input, context)
              .catch((err) => Promise.reject(new Error(`unique reference error: ${err}\nObjects were not inserted`)));

          const update = injectInput.then(
            () => Promise.all(
              input.map(
                (value, index) => items[index].update(value, { transaction: t })
              )
            )
          )
            .then((items) => {
              const report = reportCurry(info);
              report(singular(model.name), "update", items.map(o => o.id),);
              return items;
            });

          // Update related objects (in many to many associations) if any.
          return !related.toMany.size ? update :
            update
              .then((items) => bulkSetManyToMany(items, related.toMany, input, context).then(() => items))
              .catch((err) => new Error(`got error: ${err}\nBut objects were inserted`));
        });
      },
    };

    mutations[`delete${type}`] = {
      type: GenericResponseType,
      args: makeDeleteArgs(model, filterTimestamps),
      resolve: async (obj, values, info) => {
        const thing = await model.findOne({
          where: values,
        });

        await thing.destroy();

        const report = reportCurry(info);
        report(singular(model.name), "delete", [thing.get("id")]);

        return {
          success: true,
        };
      },
    };

    fieldAssociations.belongsToMany.forEach(sides => {
      const [other] = sides.filter(side => side !== model.name);
      const nameBits = [formatTypeName(model.name), formatTypeName(other)];

      ['add', 'remove'].forEach(prefix => {
        const connector = prefix === 'add' ? 'To' : 'From';
        const name = `${prefix}${nameBits.join(connector)}`;
        const otherName = singular(models[other].name);

        mutations[name] = {
          type: GenericResponseType,
          args: makePolyArgs(model, models[other], otherName),
          resolve: async (obj, values, info) => {
            const key = getPkFieldKey(model);
            const [, , otherArgumentKey] = getPolyKeys(model, models[other], otherName);

            const thingOne = await model.findByPk(values[key]);
            const thingTwo = await models[other].findByPk(
              values[otherArgumentKey]
            );

            const method = `${prefix}${graphqlFormatTypeName(singular(other))}`;

            await thingOne[method](thingTwo);

            return {
              success: true,
            };
          },
        };
      });
    });
  });

  const query = new GraphQLObjectType({
    name: 'Query',
    fields: queries,
  });

  const mutation = new GraphQLObjectType({
    name: 'Mutation',
    fields: mutations,
  });

  return {
    schema: new GraphQLSchema({ query, mutation, }),
    db: db,
  };
};

module.exports = { buildSchemaFromDatabase };
