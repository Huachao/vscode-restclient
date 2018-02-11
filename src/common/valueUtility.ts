"use strict";

export function toHttpString(val: any): string {
    const _ = require('lodash');

    if (_.isNil(val)) {
        return val;
    }

    if (Buffer.isBuffer(val)) {
        return val.toString('ascii');
    }

    return '' + val;
}
