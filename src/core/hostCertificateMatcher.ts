export interface HostCertificateSettings {
    cert?: string;
    key?: string;
    pfx?: string;
    passphrase?: string;
}

export interface HostCertificateMatch<T> {
    key: string;
    value: T;
}

export class HostCertificateConflictError extends Error {
    public constructor(public readonly keys: readonly string[]) {
        super(`Conflicting entries in rest-client.certificates: ${keys.map(key => JSON.stringify(key)).join(', ')}. Case-equivalent keys must have identical cert, key, pfx and passphrase settings.`);
        this.name = 'HostCertificateConflictError';
    }
}

// Also used by the settings schema; exact keys remain opaque for compatibility.
export const HOST_CERTIFICATE_KEY_PATTERN = '^(?:[^*]+|\\*\\*?\\.[a-zA-Z0-9_-]+(?:\\.[a-zA-Z0-9_-]+)*(?::(?:\\*|[0-9]+))?|(?:\\[[0-9a-fA-F:.]+\\]|[^*:\\s/?#\\[\\]]+):\\*)$';
const validKey = new RegExp(HOST_CERTIFICATE_KEY_PATTERN);

type ParsedKey =
    | { kind: 'exact'; host: string }
    | { kind: 'pattern'; wildcard: 'none' | 'single' | 'multi'; host: string; port: string | undefined };

type Score = [number, number, number];
const HostRank = { exact: 3, single: 2, multi: 1 };
const PortRank = { explicit: 2, none: 1, any: 0 };

export function findHostCertificate<T extends HostCertificateSettings>(
    requestUrl: string,
    hostCertificates: { [key: string]: T },
    onInvalidKey?: (key: string) => void
): HostCertificateMatch<T> | undefined {
    const { host, hostname, port } = new URL(requestUrl);
    if (!host || !hostname) {
        return undefined;
    }

    const requestHost = host.toLowerCase();
    const requestHostname = hostname.toLowerCase();
    const requestPort = port || undefined;
    // URL parse retains explicit default ports and brackets around IPv6 hosts.
    const hostWithoutPort = requestPort ? requestHost.slice(0, -requestPort.length - 1) : requestHost;
    let best: { keys: string[]; score: Score } | undefined;

    for (const key of Object.keys(hostCertificates)) {
        const parsed = parseKey(key);
        if (!parsed) {
            onInvalidKey?.(key);
            continue;
        }

        const score = scoreKey(parsed, requestHost, requestHostname, hostWithoutPort, requestPort);
        if (!score) {
            continue;
        }
        const comparison = best ? compare(score, best.score) : 1;
        if (comparison > 0) {
            best = { keys: [key], score };
        } else if (best && comparison === 0) {
            best.keys.push(key);
        }
    }

    if (!best) {
        return undefined;
    }

    const keys = best.keys.sort();
    const value = hostCertificates[keys[0]];
    if (keys.some(key => !sameCertificate(value, hostCertificates[key]))) {
        throw new HostCertificateConflictError(keys);
    }
    return { key: keys[0], value };
}

function sameCertificate(a: HostCertificateSettings, b: HostCertificateSettings): boolean {
    return a.cert === b.cert && a.key === b.key && a.pfx === b.pfx && a.passphrase === b.passphrase;
}

function parseKey(key: string): ParsedKey | undefined {
    const normalized = key.toLowerCase();
    if (!normalized.includes('*')) {
        return { kind: 'exact', host: normalized };
    }
    if (!validKey.test(normalized)) {
        return undefined;
    }

    let host = normalized;
    let port: string | undefined;
    const colon = normalized.lastIndexOf(':');
    if (colon > normalized.lastIndexOf(']')) {
        host = normalized.slice(0, colon);
        port = normalized.slice(colon + 1);
    }

    let wildcard: 'none' | 'single' | 'multi' = 'none';
    if (host.startsWith('**.')) {
        wildcard = 'multi';
        host = host.slice(3);
    } else if (host.startsWith('*.')) {
        wildcard = 'single';
        host = host.slice(2);
    }
    return { kind: 'pattern', wildcard, host, port };
}

function scoreKey(
    parsed: ParsedKey,
    requestHost: string,
    requestHostname: string,
    hostWithoutPort: string,
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
        return parsed.host === hostWithoutPort ? [HostRank.exact, 0, portRank] : undefined;
    }

    const suffix = `.${parsed.host}`;
    if (!requestHostname.endsWith(suffix)) {
        return undefined;
    }
    const labels = requestHostname.slice(0, -suffix.length).split('.');
    if (labels.some(label => !label) || (parsed.wildcard === 'single' && labels.length !== 1)) {
        return undefined;
    }
    return [
        parsed.wildcard === 'single' ? HostRank.single : HostRank.multi,
        parsed.host.split('.').length,
        portRank
    ];
}

function compare(a: Score, b: Score): number {
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            return a[i] - b[i];
        }
    }
    return 0;
}
