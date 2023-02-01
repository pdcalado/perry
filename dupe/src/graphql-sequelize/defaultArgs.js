const typeMapper = require('./typeMapper');
const JSONType = require('./types/jsonType');

module.exports = function (Model) {
  var result = {}
    , keys = Model.primaryKeyAttributes
    , type;

  if (keys) {
    keys.forEach(key => {
      var attribute = Model.rawAttributes[key];
      if (attribute) {
        type = typeMapper.toGraphQL(attribute.type, Model.sequelize.constructor);
        result[key] = {
          type: type
        };
      }
    });
  }

  // add where
  result.where = {
    type: JSONType,
    description: 'A JSON object conforming the the shape specified in http://docs.sequelizejs.com/en/latest/docs/querying/'
  };

  // add include
  result.include = {
    type: JSONType,
    description: 'A JSON object conforming the the shape specified in http://docs.sequelizejs.com/en/latest/docs/querying/'
  };

  return result;
};
