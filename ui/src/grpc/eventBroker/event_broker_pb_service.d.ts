// package: event_broker
// file: event_broker.proto

import * as event_broker_pb from "./event_broker_pb";
import {grpc} from "@improbable-eng/grpc-web";

type EventBrokerProduce = {
  readonly methodName: string;
  readonly service: typeof EventBroker;
  readonly requestStream: false;
  readonly responseStream: false;
  readonly requestType: typeof event_broker_pb.ProduceRequest;
  readonly responseType: typeof event_broker_pb.ProduceReply;
};

type EventBrokerHistory = {
  readonly methodName: string;
  readonly service: typeof EventBroker;
  readonly requestStream: false;
  readonly responseStream: true;
  readonly requestType: typeof event_broker_pb.HistoryRequest;
  readonly responseType: typeof event_broker_pb.Event;
};

type EventBrokerConsume = {
  readonly methodName: string;
  readonly service: typeof EventBroker;
  readonly requestStream: false;
  readonly responseStream: true;
  readonly requestType: typeof event_broker_pb.ConsumeRequest;
  readonly responseType: typeof event_broker_pb.Event;
};

export class EventBroker {
  static readonly serviceName: string;
  static readonly Produce: EventBrokerProduce;
  static readonly History: EventBrokerHistory;
  static readonly Consume: EventBrokerConsume;
}

export type ServiceError = { message: string, code: number; metadata: grpc.Metadata }
export type Status = { details: string, code: number; metadata: grpc.Metadata }

interface UnaryResponse {
  cancel(): void;
}
interface ResponseStream<T> {
  cancel(): void;
  on(type: 'data', handler: (message: T) => void): ResponseStream<T>;
  on(type: 'end', handler: (status?: Status) => void): ResponseStream<T>;
  on(type: 'status', handler: (status: Status) => void): ResponseStream<T>;
}
interface RequestStream<T> {
  write(message: T): RequestStream<T>;
  end(): void;
  cancel(): void;
  on(type: 'end', handler: (status?: Status) => void): RequestStream<T>;
  on(type: 'status', handler: (status: Status) => void): RequestStream<T>;
}
interface BidirectionalStream<ReqT, ResT> {
  write(message: ReqT): BidirectionalStream<ReqT, ResT>;
  end(): void;
  cancel(): void;
  on(type: 'data', handler: (message: ResT) => void): BidirectionalStream<ReqT, ResT>;
  on(type: 'end', handler: (status?: Status) => void): BidirectionalStream<ReqT, ResT>;
  on(type: 'status', handler: (status: Status) => void): BidirectionalStream<ReqT, ResT>;
}

export class EventBrokerClient {
  readonly serviceHost: string;

  constructor(serviceHost: string, options?: grpc.RpcOptions);
  produce(
    requestMessage: event_broker_pb.ProduceRequest,
    metadata: grpc.Metadata,
    callback: (error: ServiceError|null, responseMessage: event_broker_pb.ProduceReply|null) => void
  ): UnaryResponse;
  produce(
    requestMessage: event_broker_pb.ProduceRequest,
    callback: (error: ServiceError|null, responseMessage: event_broker_pb.ProduceReply|null) => void
  ): UnaryResponse;
  history(requestMessage: event_broker_pb.HistoryRequest, metadata?: grpc.Metadata): ResponseStream<event_broker_pb.Event>;
  consume(requestMessage: event_broker_pb.ConsumeRequest, metadata?: grpc.Metadata): ResponseStream<event_broker_pb.Event>;
}

