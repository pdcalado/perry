import { Event } from "grpc/eventBroker/event_broker_pb";

/**
 * Bare bones of an event, valid before and after parsing.
 */
export class RawEvent {
    private timestamp: number;
    private topic: string;
    private key: string;

    constructor(event: Event) {
        this.timestamp = event.getTimestamp();
        this.topic = event.getTopic();
        this.key = event.getKey();
    }

    getTimestamp = () => this.timestamp;
    getTopic = () => this.topic;
    getKey = () => this.key;
}

/**
 * The class for an event after being parsed.
 */
export class ParsedEvent<T extends object> extends RawEvent {
    private inner: T;

    constructor(event: Event, parser: EventParser<T>) {
        super(event);
        this.inner = parser(event);
    }

    getInner = () => this.inner;
}

/**
 * Interface of a function capable of parsing an event.
 */
export type EventParser<T> = (event: Event) => T;

/**
 * Default class for an event which can be parsed from JSON.
 * Implements ParsedEvent<T>.
 */
export class EventFromJSON<T extends object> extends ParsedEvent<T> {
    constructor(event: Event) {
        super(event, (event) =>
            JSON.parse(new TextDecoder("utf-8").decode(event.getPayload_asU8()))
        );
    }
}
