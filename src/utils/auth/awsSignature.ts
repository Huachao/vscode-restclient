import aws4 = require('aws4');
import got = require('got');

export function awsSignature(authorization: string): got.BeforeRequestHook<got.GotBodyOptions<null>> {
    const [ , accessKeyId, secretAccessKey ] = authorization.split(/\s+/);
    const credentials = {
        accessKeyId,
        secretAccessKey,
        sessionToken: /token:(\S*)/.exec(authorization)?.[1]
    };
    const awsScope = {
        region: /region:(\S*)/.exec(authorization)?.[1],
        service: /service:(\S*)/.exec(authorization)?.[1]
    };

    return async options => aws4.sign({ ...options, ...awsScope }, credentials);
}