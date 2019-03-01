"use strict";

export enum PreviewOption {
    Full,
    Headers,
    Body,
    Exchange
}

export function fromString(value: string): PreviewOption {
    value = value.toLowerCase();
    switch (value) {
        case 'headers':
            return PreviewOption.Headers;
        case 'body':
            return PreviewOption.Body;
        case 'exchange':
            return PreviewOption.Exchange;
        case 'full':
        default:
            return PreviewOption.Full;
    }
}