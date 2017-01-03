"use strict";

export interface IHARNameValue {
    name: string;
    value: string;
}

export class HARHeader implements IHARNameValue {
    constructor(public name: string, public value: string) {
    }
}

export class HARCookie implements IHARNameValue {
    constructor(public name: string, public value: string) {
    }
}

export class HARPostData {
    constructor(public mimeType: string, public text: string) {
    }
}

export class HARHttpRequest {
    constructor(public method: string, public url: string, public headers: HARHeader[], public cookies: HARCookie[], public body: HARPostData) {
    }
}