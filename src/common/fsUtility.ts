"use strict";


export function glob(pattern: string, opts?: any) {
    const Glob = require('glob');

    return new Promise<string[]>((resolve, reject) => {
        try {
            Glob(pattern, opts, (err, matches) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(matches);
                }
            });
        } catch (e) {
            reject(e);
        }
    });
}

export function readFile(filename: string) {
    const FS = require('fs');

    return new Promise<Buffer>((resolve, reject) => {
        try {
            FS.readFile(filename, (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        } catch (e) {
            reject(e);
        }
    });
}
