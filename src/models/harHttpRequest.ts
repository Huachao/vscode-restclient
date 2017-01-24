"use strict";

export interface IHARNameValue {
    name: string;
    value: string;
}

export class HARHeader implements IHARNameValue {
    public constructor(public name: string, public value: string) {
    }
}

export class HARCookie implements IHARNameValue {
    public constructor(public name: string, public value: string) {
    }
}

export class HARPostData {
    public constructor(public mimeType: string, public text: string) {
    }
}

export class HARHttpRequest {
    public constructor(public method: string, public url: string, public headers: HARHeader[], public cookies: HARCookie[], public postData: HARPostData) {
    }
}