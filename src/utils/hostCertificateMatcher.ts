import * as url from 'url';

export type HostCertificateMatch<T> = {
    key: string;
    value: T;
};

type ParsedKey =
    | { kind: 'exact'; host: string }
    | { kind: 'pattern'; wildcard: 'none' | 'single' | 'multi'; host: string; port: string | '*' | undefined };

type Score = [number, number, number];

const HostRank = { exact: 3, single: 2, multi: 1 };
const PortRank = { explicit: 2, none: 1, any: 0 };

/**
 * Finds the most specific entry of `rest-client.certificates` for a request url.
 *
 * Keys without `*` are compared exactly against the request host (including port), as before.
 * Keys with `*` support a leading `*.` (exactly one label), `**.` (one or more labels) and a
 * trailing `:*` (any port or no port). Precedence: host specificity, then port specificity.
 */
export function findHostCertificate<T>(
    requestUrl: string,
    hostCertificates: { [key: string]: T } | undefined,
    onInvalidKey?: (key: string) => void
): HostCertificateMatch<T> | undefined {
    if (!hostCertificates) {
        return undefined;
    }

    const { host, hostname, port } = url.parse(requestUrl);
    if (!host || !hostname) {
        return undefined;
    }

    const requestPort = port || undefined;
    const requestHostWithoutPort = requestPort ? host.slice(0, host.length - requestPort.length - 1) : host;

    let best: { key: string; score: Score } | undefined;
    for (const key of Object.keys(hostCertificates)) {
        const parsed = parseKey(key);
        if (!parsed) {
            onInvalidKey?.(key);
            continue;
        }

        const score = scoreKey(parsed, host, hostname, requestHostWithoutPort, requestPort);
        if (score && (!best || compare(score, best.score) > 0 || (compare(score, best.score) === 0 && key < best.key))) {
            best = { key, score };
        }
    }

    return best ? { key: best.key, value: hostCertificates[best.key] } : undefined;
}

function parseKey(key: string): ParsedKey | undefined {
    const normalized = key.toLowerCase();
    if (!normalized.includes('*')) {
        return { kind: 'exact', host: normalized };
    }

    let host = normalized;
    let port: string | '*' | undefined;
    const colon = normalized.lastIndexOf(':');
    if (colon > normalized.lastIndexOf(']')) {
        host = normalized.slice(0, colon);
        port = normalized.slice(colon + 1);
        if (port !== '*' && !/^\d+$/.test(port)) {
            return undefined;
        }
    }

    let wildcard: 'none' | 'single' | 'multi' = 'none';
    if (host.startsWith('**.')) {
        wildcard = 'multi';
        host = host.slice(3);
    } else if (host.startsWith('*.')) {
        wildcard = 'single';
        host = host.slice(2);
    }

    if (!host || host.includes('*') || host.includes('/')) {
        return undefined;
    }

    if (wildcard === 'none') {
        // Without a host wildcard, the only reason for `*` is a `:*` port wildcard.
        return port === '*' ? { kind: 'pattern', wildcard, host, port } : undefined;
    }

    if (host.includes(':') || host.includes('[') || host.startsWith('.') || host.endsWith('.')) {
        return undefined;
    }

    return { kind: 'pattern', wildcard, host, port };
}

function scoreKey(
    parsed: ParsedKey,
    requestHost: string,
    requestHostname: string,
    requestHostWithoutPort: string,
    requestPort: string | undefined
): Score | undefined {
    if (parsed.kind === 'exact') {
        return parsed.host === requestHost
            ? [HostRank.exact, 0, requestPort ? PortRank.explicit : PortRank.none]
            : undefined;
    }

    let portRank: number;
    if (parsed.port === '*') {
        portRank = PortRank.any;
    } else if (parsed.port === undefined) {
        if (requestPort) {
            return undefined;
        }
        portRank = PortRank.none;
    } else {
        if (parsed.port !== requestPort) {
            return undefined;
        }
        portRank = PortRank.explicit;
    }

    if (parsed.wildcard === 'none') {
        return parsed.host === requestHostWithoutPort ? [HostRank.exact, 0, portRank] : undefined;
    }

    const suffix = `.${parsed.host}`;
    if (!requestHostname.endsWith(suffix)) {
        return undefined;
    }

    const prefix = requestHostname.slice(0, requestHostname.length - suffix.length);
    if (!prefix || (parsed.wildcard === 'single' && prefix.includes('.'))) {
        return undefined;
    }

    const suffixLabels = parsed.host.split('.').length;
    return [parsed.wildcard === 'single' ? HostRank.single : HostRank.multi, suffixLabels, portRank];
}

function compare(a: Score, b: Score): number {
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            return a[i] - b[i];
        }
    }
    return 0;
}
