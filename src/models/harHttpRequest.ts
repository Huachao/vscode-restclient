import { ParsedUrlQuery } from 'querystring';
import { parse as urlParse } from 'url';

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

export class HAROption implements HARNameValue {
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
                const pairs = text.split('&');
                pairs.forEach(pair => {
                    const [key, ...values] = pair.split('=');
                    this.params.push(new HARParam(key, values.join('=')));
                });
            }
        }
    }
}

export class HARHttpRequest {
    public queryString: HARParam[];

    public constructor(public method: string, public url: string, public headers: HARHeader[], public cookies: HARCookie[], public postData?: HARPostData, public _options?: HAROption[]) {
        const queryObj = urlParse(url, true).query;
        this.queryString = this.flatten(queryObj);
    }

    private flatten(queryObj: ParsedUrlQuery): HARParam[] {
        const queryParams: HARParam[] = [];
        Object.keys(queryObj).forEach(name => {
            const value = queryObj[name];
            if (Array.isArray(value)) {
                queryParams.push(...value.map(v => new HARParam(name, v)));
            } else {
                queryParams.push(new HARParam(name, value));
            }
        });
        return queryParams;
    }
}