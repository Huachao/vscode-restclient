import { EventEmitter } from "vscode";
import { RequestVariableCacheKey } from "../models/requestVariableCacheKey";

export interface RequestVariableEvent {
  cacheKey: RequestVariableCacheKey;
}

const eventEmitter = new EventEmitter<RequestVariableEvent>();

export const fireEvent = (event: RequestVariableEvent) =>
  eventEmitter.fire(event);

export const OnRequestVariableEvent = eventEmitter.event;
