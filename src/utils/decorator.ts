'use strict';

import { Telemetry } from './telemetry';

export function trace(eventName: string): MethodDecorator {
    return (target, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
        if (descriptor === undefined) {
            descriptor = Object.getOwnPropertyDescriptor(target, propertyKey);
        }

        const originalMethod = descriptor.value;

        descriptor.value = function(...args: any[]) {
            Telemetry.sendEvent(eventName);
            return originalMethod.apply(this, args);
        };

        return descriptor;
    };
}