
export interface MyEvent<T> {
    (listener: (e: T) => any): any;
}

export abstract class MyEventEmitter<T> {
    abstract fire(requestVariableEvent: T): void;
    event: MyEvent<T>;
}

export class DummyEventEmitter<T> implements MyEventEmitter<T> {
    private doNothing(listener: (e: T) => any): any {
    }

    fire(requestVariableEvent: T): void {
        // do nothing
    }
    get event() { return this.doNothing; }
}