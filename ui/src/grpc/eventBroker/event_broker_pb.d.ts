// package: event_broker
// file: event_broker.proto

import * as jspb from "google-protobuf";

export class Event extends jspb.Message {
  getTimestamp(): number;
  setTimestamp(value: number): void;

  getTopic(): string;
  setTopic(value: string): void;

  getKey(): string;
  setKey(value: string): void;

  getPayload(): Uint8Array | string;
  getPayload_asU8(): Uint8Array;
  getPayload_asB64(): string;
  setPayload(value: Uint8Array | string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Event.AsObject;
  static toObject(includeInstance: boolean, msg: Event): Event.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Event, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Event;
  static deserializeBinaryFromReader(message: Event, reader: jspb.BinaryReader): Event;
}

export namespace Event {
  export type AsObject = {
    timestamp: number,
    topic: string,
    key: string,
    payload: Uint8Array | string,
  }
}

export class ProduceRequest extends jspb.Message {
  clearEventsList(): void;
  getEventsList(): Array<Event>;
  setEventsList(value: Array<Event>): void;
  addEvents(value?: Event, index?: number): Event;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ProduceRequest.AsObject;
  static toObject(includeInstance: boolean, msg: ProduceRequest): ProduceRequest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ProduceRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ProduceRequest;
  static deserializeBinaryFromReader(message: ProduceRequest, reader: jspb.BinaryReader): ProduceRequest;
}

export namespace ProduceRequest {
  export type AsObject = {
    eventsList: Array<Event.AsObject>,
  }
}

export class ProduceReply extends jspb.Message {
  clearResultsList(): void;
  getResultsList(): Array<ProduceResult>;
  setResultsList(value: Array<ProduceResult>): void;
  addResults(value?: ProduceResult, index?: number): ProduceResult;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ProduceReply.AsObject;
  static toObject(includeInstance: boolean, msg: ProduceReply): ProduceReply.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ProduceReply, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ProduceReply;
  static deserializeBinaryFromReader(message: ProduceReply, reader: jspb.BinaryReader): ProduceReply;
}

export namespace ProduceReply {
  export type AsObject = {
    resultsList: Array<ProduceResult.AsObject>,
  }
}

export class ProduceSuccess extends jspb.Message {
  getTimestamp(): number;
  setTimestamp(value: number): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ProduceSuccess.AsObject;
  static toObject(includeInstance: boolean, msg: ProduceSuccess): ProduceSuccess.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ProduceSuccess, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ProduceSuccess;
  static deserializeBinaryFromReader(message: ProduceSuccess, reader: jspb.BinaryReader): ProduceSuccess;
}

export namespace ProduceSuccess {
  export type AsObject = {
    timestamp: number,
  }
}

export class ProduceResult extends jspb.Message {
  hasOk(): boolean;
  clearOk(): void;
  getOk(): ProduceSuccess | undefined;
  setOk(value?: ProduceSuccess): void;

  hasError(): boolean;
  clearError(): void;
  getError(): string;
  setError(value: string): void;

  getInnerCase(): ProduceResult.InnerCase;
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ProduceResult.AsObject;
  static toObject(includeInstance: boolean, msg: ProduceResult): ProduceResult.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ProduceResult, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ProduceResult;
  static deserializeBinaryFromReader(message: ProduceResult, reader: jspb.BinaryReader): ProduceResult;
}

export namespace ProduceResult {
  export type AsObject = {
    ok?: ProduceSuccess.AsObject,
    error: string,
  }

  export enum InnerCase {
    INNER_NOT_SET = 0,
    OK = 1,
    ERROR = 2,
  }
}

export class HistoryRequest extends jspb.Message {
  getTopic(): string;
  setTopic(value: string): void;

  hasCriteria(): boolean;
  clearCriteria(): void;
  getCriteria(): SearchCriteria | undefined;
  setCriteria(value?: SearchCriteria): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): HistoryRequest.AsObject;
  static toObject(includeInstance: boolean, msg: HistoryRequest): HistoryRequest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: HistoryRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): HistoryRequest;
  static deserializeBinaryFromReader(message: HistoryRequest, reader: jspb.BinaryReader): HistoryRequest;
}

export namespace HistoryRequest {
  export type AsObject = {
    topic: string,
    criteria?: SearchCriteria.AsObject,
  }
}

export class SearchCriteria extends jspb.Message {
  getLimit(): number;
  setLimit(value: number): void;

  getNewestFirst(): boolean;
  setNewestFirst(value: boolean): void;

  getKey(): string;
  setKey(value: string): void;

  hasOffset(): boolean;
  clearOffset(): void;
  getOffset(): number;
  setOffset(value: number): void;

  hasTimestamp(): boolean;
  clearTimestamp(): void;
  getTimestamp(): number;
  setTimestamp(value: number): void;

  getIndexCase(): SearchCriteria.IndexCase;
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SearchCriteria.AsObject;
  static toObject(includeInstance: boolean, msg: SearchCriteria): SearchCriteria.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: SearchCriteria, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SearchCriteria;
  static deserializeBinaryFromReader(message: SearchCriteria, reader: jspb.BinaryReader): SearchCriteria;
}

export namespace SearchCriteria {
  export type AsObject = {
    limit: number,
    newestFirst: boolean,
    key: string,
    offset: number,
    timestamp: number,
  }

  export enum IndexCase {
    INDEX_NOT_SET = 0,
    OFFSET = 4,
    TIMESTAMP = 5,
  }
}

export class ConsumeRequest extends jspb.Message {
  getPattern(): string;
  setPattern(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ConsumeRequest.AsObject;
  static toObject(includeInstance: boolean, msg: ConsumeRequest): ConsumeRequest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ConsumeRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ConsumeRequest;
  static deserializeBinaryFromReader(message: ConsumeRequest, reader: jspb.BinaryReader): ConsumeRequest;
}

export namespace ConsumeRequest {
  export type AsObject = {
    pattern: string,
  }
}

