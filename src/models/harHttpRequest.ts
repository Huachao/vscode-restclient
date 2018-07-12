"use strict";

export interface HARNameValue {
    name: string;
    value: string;
}

export class HARHeader implements HARNameValue {
    public constructor(public name: string, public value: string) {
    }
}

export class HARCookie implements HARNameValue {
    public constructor(public name: string, public value: string) {
    }
}

export class HARParam implements HARNameValue {
    public constructor(public name: string, public value: string) {
    }
}

export class HARPostData {
    public params: HARParam[];
    public constructor(public mimeType: string, public text: string) {
        if (mimeType === 'application/x-www-form-urlencoded') {
            if (text) {
                text = decodeURIComponent(text.replace(/\+/g, '%20'));
                this.params = [];
                let pairs = text.split('&');
                pairs.forEach(pair => {
                    let [key, ...values] = pair.split('=');
                    this.params.push(new HARParam(key, values.join('=')));
                });
            }
        }
    }
}

export class HARHttpRequest {
    public constructor(public method: string, public url: string, public headers: HARHeader[], public cookies: HARCookie[], public postData: HARPostData) {
    }
}