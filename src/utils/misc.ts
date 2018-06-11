"use strict";

import { Headers } from '../models/base';

export function getHeader(headers: Headers, name: string): string {
    if (!headers || !name) {
        return null;
    }

    const headerName = Object.keys(headers).find(h => h.toLowerCase() === name.toLowerCase());
    return headerName && headers[headerName];
}

export function hasHeader(headers: Headers, name: string): boolean {
    return !!(headers && name && Object.keys(headers).some(h => h.toLowerCase() === name.toLowerCase()));
}
