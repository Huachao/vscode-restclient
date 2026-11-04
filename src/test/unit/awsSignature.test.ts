import * as assert from 'assert';
import * as http from 'http';
import { AddressInfo } from 'net';
import got from 'got';
import type { NormalizedOptions } from 'got';
import { awsSignature } from '../../utils/auth/awsSignature';

const ACCESS_KEY = 'AKIDEXAMPLE';
const SECRET_KEY = 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY';

describe('AWS Signature v4', () => {
    /** Runs the hook the way got does and returns the headers it signed. */
    const signed = async (url: URL, service: string, headers: Record<string, string>) => {
        const options = { url, method: 'GET', headers } as unknown as NormalizedOptions;
        await awsSignature(`AWS ${ACCESS_KEY} ${SECRET_KEY} region:us-east-1 service:${service}`)(options);
        return options.headers as unknown as Record<string, string>;
    };

    it('canonical request: host, path and query, against the example AWS publishes', async () => {
        // "Examples of the complete Signature Version 4 signing process":
        // these inputs have this signature in the AWS documentation, so it is
        // an independent check that the real URL is being signed.
        const headers = await signed(
            new URL('https://iam.amazonaws.com/?Action=ListUsers&Version=2010-05-08'),
            'iam',
            {
                'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
                'X-Amz-Date': '20150830T123600Z'
            });

        assert.strictEqual(headers.Host, 'iam.amazonaws.com');
        assert.strictEqual(
            headers.Authorization,
            'AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20150830/us-east-1/iam/aws4_request, '
            + 'SignedHeaders=content-type;host;x-amz-date, '
            + 'Signature=5d672d79c15b13162d9279b0855cfba6789a8edb4c82c400e06b5924a6f2b5d7');
    });

    describe('through got', () => {
        let server: http.Server;
        let port: number;
        const seen: Array<{ url?: string; headers: http.IncomingHttpHeaders }> = [];

        before(async () => {
            server = http.createServer((request, response) => {
                seen.push({ url: request.url, headers: request.headers });
                response.setHeader('content-type', 'application/json');
                response.end('{}');
            });
            await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
            port = (server.address() as AddressInfo).port;
        });
        after(() => new Promise<void>(resolve => server.close(() => resolve())));

        beforeEach(() => {
            seen.length = 0;
        });

        it('sends the signed request instead of skipping it (got v11 treats a hook return value as the response)', async () => {
            const authorization = `AWS ${ACCESS_KEY} ${SECRET_KEY} region:us-east-1 service:execute-api`;
            const response = await got(`http://127.0.0.1:${port}/prod/items?limit=2`, {
                responseType: 'buffer',
                throwHttpErrors: false,
                retry: 0,
                hooks: { beforeRequest: [awsSignature(authorization)] }
            });

            assert.strictEqual(response.statusCode, 200, 'the request reached the server');
            assert.strictEqual(seen.length, 1);
            assert.strictEqual(seen[0].url, '/prod/items?limit=2');
            assert.strictEqual(seen[0].headers.host, `127.0.0.1:${port}`, 'the real host is signed, not a synthesised AWS one');
            assert.match(
                seen[0].headers.authorization ?? '',
                /^AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE\/\d{8}\/us-east-1\/execute-api\/aws4_request, SignedHeaders=.*, Signature=[0-9a-f]{64}$/);
        });
    });
});
