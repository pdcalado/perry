const { GraphQLList, GraphQLNonNull } = require('graphql');
const _ = require('lodash');
const argsToFindOptions = require('./argsToFindOptions');
const { isConnection, handleConnection, nodeType } = require('./relay');
const assert = require('assert');
const Promise = require('bluebird');
const sequelize = require('sequelize');
const { replaceWhereOperators } = require('./replaceWhereOperators');

const camelcase = require('camelcase');
const pascalCase = string => {
  const cameled = camelcase(string);
  return cameled.substr(0, 1).toUpperCase() + cameled.substr(1);
};

function whereQueryVarsToValues(o, vals) {
  [
    ...Object.getOwnPropertyNames(o),
    ...Object.getOwnPropertySymbols(o)
  ].forEach(k => {
    if (_.isFunction(o[k])) {
      o[k] = o[k](vals);
      return;
    }
    if (_.isObject(o[k])) {
      whereQueryVarsToValues(o[k], vals);
    }
  });
}

function checkIsModel(target) {
  return !!target.getTableName;
}

function checkIsAssociation(target) {
  return !!target.associationType;
}

function createIncludes(model, include, varValues) {
  if (typeof include !== 'object')
    throw new Error(`include must be of type object`);

  const result = [];

  for (let related of Object.keys(include)) {
    if (!(related in model.sequelize.models))
      throw new Error(`${related} is not related with ${model.name} (make sure the plural form is being used)`);

    const other = model.sequelize.models[related];
    const assoc = model.associations[pascalCase(related)];
    let as = assoc && assoc.as;

    if (!include[related].where)
      throw new Error(`include must have a where clause`);

    const where = replaceWhereOperators(include[related].where);

    if (!_.isEmpty(varValues))
      whereQueryVarsToValues(where, varValues);

    const parsed = {
      model: other,
      attributes: Object.keys(other.rawAttributes),
      where,
      as
    };

    // nest includes if any
    if (include[related].include)
      parsed.include = createIncludes(other, include[related].include, varValues);

    result.push(parsed);
  }

  return result;
}

function resolverFactory(targetMaybeThunk, options = {}) {
  assert(
    typeof targetMaybeThunk === 'function' || checkIsModel(targetMaybeThunk) || checkIsAssociation(targetMaybeThunk),
    'resolverFactory should be called with a model, an association or a function (which resolves to a model or an association)'
  );

  const contextToOptions = _.assign({}, resolverFactory.contextToOptions, options.contextToOptions);

  assert(options.include === undefined, 'Include support has been removed in favor of dataloader batching');
  if (options.before === undefined) options.before = (options) => options;
  if (options.after === undefined) options.after = (result) => result;
  if (options.handleConnection === undefined) options.handleConnection = true;

  return async function (source, args, context, info) {
    let target = typeof targetMaybeThunk === 'function' && !checkIsModel(targetMaybeThunk) ?
      await Promise.resolve(targetMaybeThunk(source, args, context, info)) : targetMaybeThunk
      , isModel = checkIsModel(target)
      , isAssociation = checkIsAssociation(target)
      , association = isAssociation && target
      , model = isAssociation && target.target || isModel && target
      , type = info.returnType
      , list = options.list ||
        type instanceof GraphQLList ||
        type instanceof GraphQLNonNull && type.ofType instanceof GraphQLList;

    let targetAttributes = Object.keys(model.rawAttributes)
      , findOptions = argsToFindOptions(args, targetAttributes);

    info = {
      ...info,
      type: type,
      source: source,
      target: target
    };

    context = context || {};

    if (isConnection(type)) {
      type = nodeType(type);
    }

    type = type.ofType || type;

    findOptions.attributes = targetAttributes;
    findOptions.logging = findOptions.logging || context.logging;
    findOptions.graphqlContext = context;

    _.each(contextToOptions, (as, key) => {
      findOptions[as] = context[key];
    });

    return Promise
      .resolve(options.before(findOptions, args, context, info))
      .then(function (findOptions) {

        if (args.where && !_.isEmpty(info.variableValues)) {
          whereQueryVarsToValues(args.where, info.variableValues);
          whereQueryVarsToValues(findOptions.where, info.variableValues);
        }

        if (list && !findOptions.order) {
          findOptions.order = [[model.primaryKeyAttribute, 'ASC']];
        }

        if (association) {
          if (source[association.as] !== undefined) {
            // The user did a manual include
            const result = source[association.as];
            if (options.handleConnection && isConnection(info.returnType)) {
              return handleConnection(result, args);
            }

            return result;
          } else {
            return source[association.accessors.get](findOptions).then(function (result) {
              if (options.handleConnection && isConnection(info.returnType)) {
                return handleConnection(result, args);
              }
              return result;
            });
          }
        }

        if (args.include) {
          findOptions.include = createIncludes(model, args.include, info.variableValues);
        }

        return model[list ? 'findAll' : 'findOne'](findOptions);
      })
      .then(function (result) {
        return options.after(result, args, context, info);
      });
  };
}

resolverFactory.contextToOptions = {};

module.exports = resolverFactory;
