import * as aws4 from 'aws4';
import type { BeforeRequestHook } from 'got';

export function awsSignature(authorization: string): BeforeRequestHook {
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

    return async options => {
        // got v11 hands the hook a `url` (a URL object) but no `host` or
        // `path`: without them aws4 signs `GET /` for every request and
        // invents `service.region.amazonaws.com` as the Host. And a hook that
        // returns a value is taken as a response by got, which skips the
        // request and then fails: sign in place and return nothing.
        const url = options.url;
        aws4.sign({
            host: url.host,
            path: `${url.pathname}${url.search}`,
            method: options.method,
            body: options.body as string | Buffer | undefined,
            headers: options.headers as any,
            ...awsScope
        }, credentials);
    };
}