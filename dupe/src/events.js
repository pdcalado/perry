const PROTO_PATH = `../proto/event_broker.proto`;

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const packageDefinition = protoLoader.loadSync(
    PROTO_PATH,
    {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true
    });
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);

// namespace containing proto types and description for event_broker.
var event_broker = protoDescriptor.event_broker;

class EventBrokerClient {
    topic;
    client;

    constructor(url, topic) {
        this.topic = topic;
        this.client = new event_broker.EventBroker(url, grpc.credentials.createInsecure());
    }

    produce = (key, payload, metadata) => {
        const request = {
            events: [{
                topic: this.topic,
                key,
                payload,
            }]
        };

        const meta = new grpc.Metadata();
        Object.keys(metadata).forEach((key) => meta.add(key, metadata[key]));

        this.client.produce(
            request,
            meta,
            (err) => {
                if (err) {
                    console.error("error producing event:", err);
                    return;
                }
            }
        );
    }
}

module.exports = EventBrokerClient;