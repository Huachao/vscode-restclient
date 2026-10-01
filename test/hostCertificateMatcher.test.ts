import * as assert from 'assert';
import { findHostCertificate } from '../src/utils/hostCertificateMatcher';

function match(requestUrl: string, keys: string[]): string | undefined {
    const certs: { [key: string]: string } = {};
    for (const key of keys) {
        certs[key] = key;
    }
    return findHostCertificate(requestUrl, certs)?.key;
}

describe('findHostCertificate', () => {
    describe('exact keys (unchanged behaviour)', () => {
        it('matches host without port', () => {
            assert.strictEqual(match('https://foo.com/a', ['foo.com']), 'foo.com');
        });

        it('does not match a key without port when the request has a port', () => {
            assert.strictEqual(match('https://foo.com:8443/', ['foo.com']), undefined);
        });

        it('matches host with port', () => {
            assert.strictEqual(match('https://foo.com:8443/', ['foo.com:8443']), 'foo.com:8443');
            assert.strictEqual(match('https://foo.com/', ['foo.com:8443']), undefined);
            assert.strictEqual(match('https://foo.com:9000/', ['foo.com:8443']), undefined);
        });

        it('keeps the default-port quirk', () => {
            assert.strictEqual(match('https://foo.com:443/', ['foo.com']), undefined);
            assert.strictEqual(match('https://foo.com/', ['foo.com:443']), undefined);
        });

        it('matches unusual hosts as opaque strings', () => {
            assert.strictEqual(match('https://[::1]:8443/', ['[::1]:8443']), '[::1]:8443');
            assert.strictEqual(match('https://my_host/', ['my_host']), 'my_host');
        });

        it('is case-insensitive', () => {
            assert.strictEqual(match('https://foo.com/', ['Foo.COM']), 'Foo.COM');
            assert.strictEqual(match('https://FOO.com/', ['foo.com']), 'foo.com');
        });

        it('does not match subdomains or the parent domain', () => {
            assert.strictEqual(match('https://a.foo.com/', ['foo.com']), undefined);
            assert.strictEqual(match('https://foo.com/', ['a.foo.com']), undefined);
        });
    });

    describe('single-label wildcard *.', () => {
        it('matches exactly one extra label', () => {
            assert.strictEqual(match('https://a.example.com/', ['*.example.com']), '*.example.com');
        });

        it('does not match deeper labels or the apex', () => {
            assert.strictEqual(match('https://a.b.example.com/', ['*.example.com']), undefined);
            assert.strictEqual(match('https://example.com/', ['*.example.com']), undefined);
        });

        it('requires a label boundary', () => {
            assert.strictEqual(match('https://notexample.com/', ['*.example.com']), undefined);
        });

        it('does not match a request with a port unless the key allows it', () => {
            assert.strictEqual(match('https://a.example.com:8443/', ['*.example.com']), undefined);
            assert.strictEqual(match('https://a.example.com:8443/', ['*.example.com:8443']), '*.example.com:8443');
            assert.strictEqual(match('https://a.example.com:9000/', ['*.example.com:8443']), undefined);
        });
    });

    describe('multi-label wildcard **.', () => {
        it('matches one or more extra labels', () => {
            assert.strictEqual(match('https://a.example.com/', ['**.example.com']), '**.example.com');
            assert.strictEqual(match('https://a.b.c.example.com/', ['**.example.com']), '**.example.com');
        });

        it('does not match the apex', () => {
            assert.strictEqual(match('https://example.com/', ['**.example.com']), undefined);
        });
    });

    describe('port wildcard :*', () => {
        it('matches any port and no port', () => {
            assert.strictEqual(match('https://foo.com/', ['foo.com:*']), 'foo.com:*');
            assert.strictEqual(match('https://foo.com:443/', ['foo.com:*']), 'foo.com:*');
            assert.strictEqual(match('https://foo.com:8443/', ['foo.com:*']), 'foo.com:*');
            assert.strictEqual(match('https://a.b.example.com:1/', ['**.example.com:*']), '**.example.com:*');
        });

        it('works with IPv6 hosts', () => {
            assert.strictEqual(match('https://[::1]:8443/', ['[::1]:*']), '[::1]:*');
            assert.strictEqual(match('https://[::1]/', ['[::1]:*']), '[::1]:*');
        });
    });

    describe('precedence', () => {
        it('prefers exact over *. over **.', () => {
            const keys = ['**.example.com', '*.example.com', 'a.example.com'];
            assert.strictEqual(match('https://a.example.com/', keys), 'a.example.com');
            assert.strictEqual(match('https://b.example.com/', keys), '*.example.com');
            assert.strictEqual(match('https://x.b.example.com/', keys), '**.example.com');
        });

        it('prefers the longer suffix among ** wildcards', () => {
            const keys = ['**.example.com', '**.api.example.com'];
            assert.strictEqual(match('https://x.api.example.com/', keys), '**.api.example.com');
            assert.strictEqual(match('https://x.web.example.com/', keys), '**.example.com');
        });

        it('ranks host specificity before port specificity', () => {
            const keys = ['*.example.com:8443', 'a.example.com:*'];
            assert.strictEqual(match('https://a.example.com:8443/', keys), 'a.example.com:*');
        });

        it('prefers an explicit port over :*', () => {
            const keys = ['foo.com:*', 'foo.com:8443'];
            assert.strictEqual(match('https://foo.com:8443/', keys), 'foo.com:8443');
            assert.strictEqual(match('https://foo.com:9000/', keys), 'foo.com:*');
        });

        it('prefers a key without port over :* when the request has no port', () => {
            assert.strictEqual(match('https://foo.com/', ['foo.com:*', 'foo.com']), 'foo.com');
            assert.strictEqual(match('https://a.example.com/', ['*.example.com:*', '*.example.com']), '*.example.com');
        });

        it('does not depend on key order', () => {
            const keys = ['**.example.com', '*.example.com', 'a.example.com:*'];
            for (const order of [keys, [...keys].reverse()]) {
                assert.strictEqual(match('https://a.example.com/', order), 'a.example.com:*');
            }
        });
    });

    describe('invalid keys', () => {
        const invalid = ['foo*.example.com', 'a.*.example.com', '*example.com', '*', '**', '*.', '*.example.com:abc', '***.example.com', 'https://*.example.com'];

        it('are ignored and reported', () => {
            const reported: string[] = [];
            const certs: { [key: string]: string } = {};
            for (const key of invalid) {
                certs[key] = key;
            }
            assert.strictEqual(findHostCertificate('https://a.example.com/', certs, k => reported.push(k)), undefined);
            assert.deepStrictEqual(reported.sort(), [...invalid].sort());
        });

        it('do not affect valid keys', () => {
            assert.strictEqual(match('https://a.example.com/', [...invalid, '*.example.com']), '*.example.com');
        });

        it('keys without * are never reported', () => {
            const reported: string[] = [];
            findHostCertificate('https://a.example.com/', { 'foo.com': 1, '[::1]:8443': 2, 'https://foo.com': 3 }, k => reported.push(k));
            assert.deepStrictEqual(reported, []);
        });
    });

    it('returns undefined for missing settings or unparsable urls', () => {
        assert.strictEqual(findHostCertificate('https://foo.com/', undefined), undefined);
        assert.strictEqual(findHostCertificate('not a url', { 'foo.com': 1 }), undefined);
    });

    it('returns the configured value', () => {
        const value = { cert: 'a.crt', key: 'a.key' };
        assert.deepStrictEqual(findHostCertificate('https://a.example.com/', { '*.example.com': value }), { key: '*.example.com', value });
    });
});
