"use strict";

export class HostCertificate {
    public constructor(public cert?: string, public key?: string, public pfx?: string, public passphrase?: string) {
    }
}