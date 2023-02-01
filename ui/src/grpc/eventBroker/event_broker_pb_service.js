// package: event_broker
// file: event_broker.proto

var event_broker_pb = require("./event_broker_pb");
var grpc = require("@improbable-eng/grpc-web").grpc;

var EventBroker = (function () {
  function EventBroker() {}
  EventBroker.serviceName = "event_broker.EventBroker";
  return EventBroker;
}());

EventBroker.Produce = {
  methodName: "Produce",
  service: EventBroker,
  requestStream: false,
  responseStream: false,
  requestType: event_broker_pb.ProduceRequest,
  responseType: event_broker_pb.ProduceReply
};

EventBroker.History = {
  methodName: "History",
  service: EventBroker,
  requestStream: false,
  responseStream: true,
  requestType: event_broker_pb.HistoryRequest,
  responseType: event_broker_pb.Event
};

EventBroker.Consume = {
  methodName: "Consume",
  service: EventBroker,
  requestStream: false,
  responseStream: true,
  requestType: event_broker_pb.ConsumeRequest,
  responseType: event_broker_pb.Event
};

exports.EventBroker = EventBroker;

function EventBrokerClient(serviceHost, options) {
  this.serviceHost = serviceHost;
  this.options = options || {};
}

EventBrokerClient.prototype.produce = function produce(requestMessage, metadata, callback) {
  if (arguments.length === 2) {
    callback = arguments[1];
  }
  var client = grpc.unary(EventBroker.Produce, {
    request: requestMessage,
    host: this.serviceHost,
    metadata: metadata,
    transport: this.options.transport,
    debug: this.options.debug,
    onEnd: function (response) {
      if (callback) {
        if (response.status !== grpc.Code.OK) {
          var err = new Error(response.statusMessage);
          err.code = response.status;
          err.metadata = response.trailers;
          callback(err, null);
        } else {
          callback(null, response.message);
        }
      }
    }
  });
  return {
    cancel: function () {
      callback = null;
      client.close();
    }
  };
};

EventBrokerClient.prototype.history = function history(requestMessage, metadata) {
  var listeners = {
    data: [],
    end: [],
    status: []
  };
  var client = grpc.invoke(EventBroker.History, {
    request: requestMessage,
    host: this.serviceHost,
    metadata: metadata,
    transport: this.options.transport,
    debug: this.options.debug,
    onMessage: function (responseMessage) {
      listeners.data.forEach(function (handler) {
        handler(responseMessage);
      });
    },
    onEnd: function (status, statusMessage, trailers) {
      listeners.status.forEach(function (handler) {
        handler({ code: status, details: statusMessage, metadata: trailers });
      });
      listeners.end.forEach(function (handler) {
        handler({ code: status, details: statusMessage, metadata: trailers });
      });
      listeners = null;
    }
  });
  return {
    on: function (type, handler) {
      listeners[type].push(handler);
      return this;
    },
    cancel: function () {
      listeners = null;
      client.close();
    }
  };
};

EventBrokerClient.prototype.consume = function consume(requestMessage, metadata) {
  var listeners = {
    data: [],
    end: [],
    status: []
  };
  var client = grpc.invoke(EventBroker.Consume, {
    request: requestMessage,
    host: this.serviceHost,
    metadata: metadata,
    transport: this.options.transport,
    debug: this.options.debug,
    onMessage: function (responseMessage) {
      listeners.data.forEach(function (handler) {
        handler(responseMessage);
      });
    },
    onEnd: function (status, statusMessage, trailers) {
      listeners.status.forEach(function (handler) {
        handler({ code: status, details: statusMessage, metadata: trailers });
      });
      listeners.end.forEach(function (handler) {
        handler({ code: status, details: statusMessage, metadata: trailers });
      });
      listeners = null;
    }
  });
  return {
    on: function (type, handler) {
      listeners[type].push(handler);
      return this;
    },
    cancel: function () {
      listeners = null;
      client.close();
    }
  };
};

exports.EventBrokerClient = EventBrokerClient;

