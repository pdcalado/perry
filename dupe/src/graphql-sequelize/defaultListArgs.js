const { GraphQLInt, GraphQLString } = require('graphql');
const JSONType = require('./types/jsonType');

module.exports = function () {
  return {
    limit: {
      type: GraphQLInt
    },
    order: {
      type: GraphQLString
    },
    where: {
      type: JSONType,
      description: 'A JSON object conforming the the shape specified in http://docs.sequelizejs.com/en/latest/docs/querying/'
    },
    offset: {
      type: GraphQLInt
    },
    include: {
      type: JSONType,
      description: 'A JSON object conforming the the shape specified in http://docs.sequelizejs.com/en/latest/docs/querying/'
    }
  };

};
