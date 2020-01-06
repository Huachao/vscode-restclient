import { EventEmitter } from "vscode";
import { MyEvent, MyEventEmitter } from "./myEventEmitter";

export class EventEmitterVS<T> implements MyEventEmitter<T> {
    public constructor(private e: EventEmitter<T>) {
    }

    fire(requestVariableEvent: T): void {
        this.e.fire(requestVariableEvent);
    }
    get event(): MyEvent<T> {
        return this.e.event;
    }
}