"use strict";

export class HostCertificate {
    public constructor(public cert?: Buffer, public key?: Buffer, public pfx?: Buffer, public passphrase?: string) {
    }
}