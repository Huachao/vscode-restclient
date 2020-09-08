import { AmazonWebServicesSignatureDetails } from "./amazonWebServicesSignatureDetails";

export class Authorization {
    name: string;
    value: string;

    toString(): string {
        return `${this.name}: ${this.value}`;
    }

    constructor(value: string) {
        this.value = value;
        this.name = "Authorization";
    }
}

export class ApiKeyAuth extends Authorization {
    constructor(value: string) {
        super(value);
        this.name = 'api-key';
    }
}

export class BearerAuth extends Authorization {
    constructor(token: string, name: string = "Authorization") {
        super('Bearer ' + token);
        this.name = name;
    }
}

export class BasicAuth extends Authorization {
    static fromUserPass(user: string, pass: string, separator: string = ':'): BasicAuth {
        return new BasicAuth('Basic ' + user + separator + pass);
    }

    static fromBase64String(encodedBase64String: string): BasicAuth {
        return new BasicAuth('Basic ' + encodedBase64String);
    }
}

export class DigestAuth extends Authorization {
    static fromUserPass(user: string, pass: string, separator: string = ':'): BasicAuth {
        return new BasicAuth('Digest ' + user + separator + pass);
    }

    static fromBase64String(encodedBase64String: string): BasicAuth {
        return new BasicAuth('Digest ' + encodedBase64String);
    }
}

export class AWSAuth extends Authorization {
    static fromDetails(details: AmazonWebServicesSignatureDetails): AWSAuth {
        return new AWSAuth('AWS ' + details.toString());
    }
}