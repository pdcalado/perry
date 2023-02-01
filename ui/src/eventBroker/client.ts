import { grpc } from "@improbable-eng/grpc-web";
import { EventBroker } from "grpc/eventBroker/event_broker_pb_service";
import { ConsumeRequest, Event } from "grpc/eventBroker/event_broker_pb";
import { ParsedEvent, EventParser, EventFromJSON } from "./event";
export { Event } from "grpc/eventBroker/event_broker_pb";

export type CloseConsumer = () => void;
export type onEvent = (event: Event) => void;
export type onError = (code: grpc.Code, msg: string) => void;
export type onParsedEvent = <T extends object>(event: ParsedEvent<T>) => void;

interface Closeable {
    close: CloseConsumer;
}

export class EventBrokerClient {
    readonly baseUrl: string;
    token: string;

    constructor(baseUrl: string, token: string) {
        this.baseUrl = baseUrl;
        this.token = token;
    }

    consume = (
        pattern: string,
        onEvent: onEvent,
        onError?: onError
    ): CloseConsumer => {
        const retry = new Retryable(
            {
                host: this.baseUrl,
                token: this.token,
                pattern,
                onEvent,
                onError,
            },
            startConsumer
        );
        return retry.start();
    };

    consumeParseEvent = <T extends object>(
        pattern: string,
        parser: EventParser<ParsedEvent<T>>,
        onParsedEvent: onParsedEvent,
        onError?: onError
    ): CloseConsumer =>
        this.consume(
            pattern,
            (event: Event) => onParsedEvent(parser(event)),
            onError
        );

    consumeJsonEvent = (
        pattern: string,
        onParsedEvent: onParsedEvent,
        onError?: onError
    ): CloseConsumer =>
        this.consume(
            pattern,
            (event) => onParsedEvent(new EventFromJSON(event)),
            onError
        );
}

class Retryable {
    props: any;
    builder: (props: any, retry: () => void) => Closeable;
    client?: Closeable;
    interval: number;

    constructor(
        props: any,
        builder: (props: any, retry: () => void) => Closeable,
        interval?: number
    ) {
        this.props = props;
        this.builder = builder;
        this.interval = interval || 5000;
    }

    start = (): CloseConsumer => {
        this.doStart();
        return () => this.close();
    };

    doStart = () => {
        this.client = this.builder(this.props, this.retry);
    };

    retry = () => {
        console.log("retrying...");
        setTimeout(this.doStart, 5000);
    };

    close = () => {
        console.log("closing...");
        this.client && this.client.close();
    };
}

const startConsumer = (
    {
        host,
        token,
        pattern,
        onEvent,
        onError,
    }: {
        host: string;
        token: string;
        pattern: string;
        onEvent: onEvent;
        onError?: onError;
    },
    retry: () => void
) => {
    const client = grpc.client(EventBroker.Consume, { host });
    client.onHeaders(() => {});
    client.onMessage((message: grpc.ProtobufMessage) => {
        onEvent(message as Event);
        console.log("message", message);
    });
    client.onEnd((code: grpc.Code, msg: string, trailers: grpc.Metadata) => {
        if (code !== grpc.Code.OK && code !== 1) {
            console.log("closed abruptly:", msg, code);
            onError && onError(code, msg);
            retry();
        }
    });

    client.start({ authorization: "Bearer " + token });

    const request = new ConsumeRequest();
    request.setPattern(pattern);
    client.send(request);
    console.log("consuming...");
    return client;
};
