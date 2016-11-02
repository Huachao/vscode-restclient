"use strict";

export interface IHARNameValue {
    name: string;
    value: string;
}

export class HARHeader implements IHARNameValue {
    name: string;
    value: string;

    constructor(name, value) {
        this.name = name;
        this.value = value;
    }
}

export class HARCookie implements IHARNameValue {
    name: string;
    value: string;

    constructor(name, value) {
        this.name = name;
        this.value = value;
    }
}

export class HARPostData {
    mimeType: string;
    text: string;

    constructor(mimeType, text) {
        this.mimeType = mimeType;
        this.text = text;
    }
}

export class HARHttpRequest {
    method: string;
    url: string;
    headers: HARHeader[];
    cookies: HARCookie[];
    postData: HARPostData;

    constructor(method: string, url: string, headers: HARHeader[], cookies: HARCookie[], body: HARPostData) {
        this.method = method;
        this.url = url;
        this.headers = headers;
        this.cookies = cookies;
        this.postData = body;
    }
}