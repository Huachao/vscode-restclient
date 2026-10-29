import * as fs from 'fs-extra';
import * as iconv from 'iconv-lite';
import * as path from 'path';
import { CookieJar, Store } from 'tough-cookie';
import { window } from 'vscode';
import * as url from 'url';
import { findHostCertificate } from '../core/hostCertificateMatcher';
import { RequestHeaders, ResponseHeaders } from '../models/base';
import type { IRestClientSettings } from '../models/configurationSettings';
import { HttpRequest } from '../models/httpRequest';
import { HttpResponse } from '../models/httpResponse';
import { awsSignature } from './auth/awsSignature';
import { digest } from './auth/digest';
import { MimeUtility } from './mimeUtility';
import { base64, getHeader, removeHeader } from './misc';
import { convertBufferToStream, convertStreamToBuffer } from './streamUtility';
import { UserDataManager } from './userDataManager';
import { EnvironmentData, resolveRelativePath } from '../core/environment';

function editorSettings(): IRestClientSettings {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('../models/configurationSettings').SystemSettings.Instance;
}

/**
 * Default environment: the editor's. This is the only place in this file that
 * knows about VS Code, and it loads lazily so the terminal runner never ends
 * up importing it.
 */
const EDITOR_ENVIRONMENT: EnvironmentData = {
    logError: (message: string) => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require('../logger').default.error(message);
    },
    warn: (message: string) => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { window } = require('vscode');
        window.showWarningMessage(message);
    },
    root: () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const root = require('./workspaceUtility').getWorkspaceRootPath();
        if (!root) {
            return undefined;
        }
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { Uri } = require('vscode');
        return Uri.parse(root).fsPath as string;
    },
    currentFile: () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        return require('./workspaceUtility').getCurrentHttpFilePath();
    }
};

import { CancelableRequest, Headers, Method, OptionsOfBufferResponseBody, Response } from 'got';
import got from 'got';
import * as crypto from 'crypto';

const encodeUrl = require('encodeurl');
const CookieFileStore = require('tough-cookie-file-store').FileCookieStore;

/** Response metadata as soon as the headers arrive, before the body. */
export interface ResponseMeta {
    status: number;
    message: string;
    version: string;
    headers: ResponseHeaders;
}

/** Called for each chunk of the body as it arrives: this is what lets a stream be painted live. */
export type OnReceive = (chunk: Buffer, meta: ResponseMeta) => void;

type Certificate = {
    cert?: Buffer;
    key?: Buffer;
    pfx?: Buffer;
    passphrase?: string;
};

export class HttpClient {
    private cookieStore: Store;

    public constructor(private readonly _environment?: EnvironmentData) {
        const cookieFilePath = UserDataManager.cookieFilePath;
        this.cookieStore = new CookieFileStore(cookieFilePath) as Store;
    }

    public async send(httpRequest: HttpRequest, settings?: IRestClientSettings, onReceive?: OnReceive): Promise<HttpResponse> {
        // Editor settings load lazily: a caller from the terminal passes its
        // own and never reaches this line, which is what keeps this file free
        // of VS Code.
        settings = settings || editorSettings();

        const options = await this.prepareOptions(httpRequest, settings);

        let bodySize = 0;
        let headersSize = 0;
        const requestUrl = encodeUrl(httpRequest.url);
        const request: CancelableRequest<Response<Buffer>> = got(requestUrl, options);
        httpRequest.setUnderlyingRequest(request);
        (request as any).on('response', res => {
            if (res.rawHeaders) {
                headersSize += res.rawHeaders.map(h => h.length).reduce((a, b) => a + b, 0);
                headersSize += (res.rawHeaders.length) / 2;
            }
            const meta: ResponseMeta = {
                status: res.statusCode ?? 0,
                message: res.statusMessage ?? '',
                version: res.httpVersion ?? '1.1',
                headers: HttpClient.normalizeHeaderNames(res.headers, res.rawHeaders ?? [])
            };
            res.on('data', chunk => {
                bodySize += chunk.length;
                onReceive?.(chunk, meta);
            });
        });

        const response = await request;

        const contentType = response.headers['content-type'];
        let encoding: string | undefined;
        if (contentType) {
            encoding = MimeUtility.parse(contentType).charset;
        }

        if (!encoding) {
            encoding = "utf8";
        }

        const bodyBuffer = response.body;
        let bodyString = iconv.encodingExists(encoding) ? iconv.decode(bodyBuffer, encoding) : bodyBuffer.toString();

        if (settings.decodeEscapedUnicodeCharacters) {
            bodyString = this.decodeEscapedUnicodeCharacters(bodyString);
        }

        // adjust response header case, due to the response headers in nodejs http module is in lowercase
        const responseHeaders: ResponseHeaders = HttpClient.normalizeHeaderNames(response.headers, response.rawHeaders);

        const requestBody = options.body;

        return new HttpResponse(
            response.statusCode,
            response.statusMessage!,
            response.httpVersion,
            responseHeaders,
            bodyString,
            bodySize,
            headersSize,
            bodyBuffer,
            response.timings.phases,
            new HttpRequest(
                options.method!,
                requestUrl,
                HttpClient.normalizeHeaderNames(
                    (response as any).request.options.headers as RequestHeaders,
                    Object.keys(httpRequest.headers)),
                Buffer.isBuffer(requestBody) ? convertBufferToStream(requestBody) : requestBody,
                httpRequest.rawBody,
                httpRequest.name
            ));
    }

    public async clearCookies() {
        await fs.remove(UserDataManager.cookieFilePath);
        this.cookieStore = new CookieFileStore(UserDataManager.cookieFilePath) as Store;
    }

    private async prepareOptions(httpRequest: HttpRequest, settings: IRestClientSettings): Promise<OptionsOfBufferResponseBody> {
        const originalRequestBody = httpRequest.body;
        let requestBody: string | Buffer | undefined;

        // Fix #682 Do not touch original headers in httpRequest, which may be used for retry later
        // Simply do a shadow copy here
        const clonedHeaders = Object.assign({}, httpRequest.headers);

        const authorization = getHeader(clonedHeaders, 'Authorization') as string | undefined;
        if (originalRequestBody) {
            requestBody = (typeof originalRequestBody !== 'string') 
                ? await convertStreamToBuffer(originalRequestBody)
                : originalRequestBody;
        }

        const options: OptionsOfBufferResponseBody = {
            headers: clonedHeaders as any as Headers,
            method: httpRequest.method as any as Method,
            body: requestBody,
            responseType: 'buffer',
            decompress: true,
            followRedirect: settings.followRedirect,
            throwHttpErrors: false,
            retry: { limit: 0 },
            hooks: {
                afterResponse: [],
                beforeRequest: [],
            },
            https: {
                rejectUnauthorized: false,
            },
        };

        if (settings.timeoutInMilliseconds > 0) {
            options.timeout = { request: settings.timeoutInMilliseconds };
        }

        if (settings.rememberCookiesForSubsequentRequests) {
            options.cookieJar = new CookieJar(this.cookieStore);
        }

        if (authorization) {
            const [scheme, ...args] = authorization.split(/\s+/);
            const normalizedScheme = scheme.toLowerCase();

            switch (normalizedScheme) {
                case 'basic':
                    if (args.length > 0) {
                        const firstArg = args[0];
                        removeHeader(options.headers!, 'Authorization');
                        // Issue #8 : Check if the username contains ":", if yes, split it into username and password
                        // Case 1 : "Basic user:password"
                        if (firstArg.includes(':')) {
                            const fullArg = args.join(' ');
                            const colonIndex = fullArg.indexOf(':');
                            options.username = fullArg.substring(0, colonIndex);
                            options.password = fullArg.substring(colonIndex + 1);
                        }
                        // Case 2: "Basic user password" if no password, it works anyway
                        else {
                            options.username = args.shift()!;
                            options.password = args.join(' ');
                        }
                        // No password means user is basé64 encoded user:password
                        const credential = (options.password.length > 0) 
                            ? base64(`${options.username}:${options.password}`)
                            : `${options.username}`;
                        (options.headers as Record<string, string>)['Authorization'] = `Basic ${credential}`
                    }
                    break;
                case 'digest':
                    if (args.length > 0) {
                        const user = args.shift()!;
                        const pass = args.join(' ');
                        removeHeader(options.headers!, 'Authorization');
                        options.hooks!.afterResponse!.push(digest(user, pass));
                    }
                    break;
                case 'bearer':
                    // Keep the Authorization header as is.
                    break;
                case 'aws':
                    if (requestBody !== undefined) {
                       options.headers!['X-Amz-Content-Sha256'] = crypto.createHash('sha256').update(requestBody).digest('hex');
                    }
                    if (args.length >= 3) {
                        removeHeader(options.headers!, 'Authorization');
                        options.hooks!.beforeRequest!.push(awsSignature(authorization));
                    } else {
                        window.showWarningMessage(
                            `Invalid AWS authorization header, the format should be "Authorization: AWS [region:<region>] [service:<service>] [token:<sessionToken>] <accessKeyId> <secretAccessKey>". The Authorization header will be sent as is.`
                        );
                    }
                    break;
                case 'cognito':
                    if (requestBody !== undefined) {
                       options.headers!['X-Amz-Content-Sha256'] = crypto.createHash('sha256').update(requestBody).digest('hex');
                    }
                    if (args.length >= 4) {
                        removeHeader(options.headers!, 'Authorization');
                        const { awsCognito } = await require('./auth/awsCognito');
                        options.hooks!.beforeRequest!.push(await awsCognito(authorization));
                    } else {
                        window.showWarningMessage(
                            `Invalid Cognito authorization header, the format should be "Authorization: Cognito [...] <username> <password> <userPoolId> <clientId>". The Authorization header will be sent as is.`
                        );
                    }
                    break;
                default:
                    window.showWarningMessage(
                        `Authorization scheme ${scheme} is not supported, the Authorization header will be sent as is.`
                    );
            }
        }

        // set certificate
        const certificate = this.getRequestCertificate(httpRequest.url, settings);
        if (certificate) {
            Object.assign(options, certificate);
        }

        // Set proxy
        if (
            settings.proxy &&
            !HttpClient.ignoreProxy(httpRequest.url, settings.excludeHostsForProxy)
        ) {
            if (httpRequest.url.startsWith('http:')) {
                // Dynamically import to avoid loading the module when not needed
                const { HttpProxyAgent } = await import('http-proxy-agent');
                options.agent = {
                    http: new HttpProxyAgent(settings.proxy),
                };
            } else {
                const { HttpsProxyAgent } = await import('https-proxy-agent');
                options.agent = {
                    https: new HttpsProxyAgent(settings.proxy),
                };
            }
        }

        return options;
    }

    private decodeEscapedUnicodeCharacters(body: string): string {
        return body.replace(/\\u([0-9a-fA-F]{4})/gi, (_, g) => {
            const char = String.fromCharCode(parseInt(g, 16));
            return char === '"' ? '\\"' : char;
        });
    }

    private getRequestCertificate(requestUrl: string, settings: IRestClientSettings): Certificate | null {
        const match = findHostCertificate(requestUrl, settings.hostCertificates, key => this.warnInvalidCertificateKey(key));
        if (!match) {
            return null;
        }

        const { cert: certPath, key: keyPath, pfx: pfxPath, passphrase } = match.value;
        const cert = this.resolveCertificate(certPath);
        const key = this.resolveCertificate(keyPath);
        const pfx = this.resolveCertificate(pfxPath);
        return { cert, key, pfx, passphrase };
    }

    private static readonly warnedInvalidCertificateKeys = new Set<string>();

    private warnInvalidCertificateKey(key: string): void {
        if (HttpClient.warnedInvalidCertificateKeys.has(key)) {
            return;
        }
        HttpClient.warnedInvalidCertificateKeys.add(key);
        const message = `Ignoring invalid key ${JSON.stringify(key)} in rest-client.certificates. A wildcard must be a leading "*." or "**." label, or a ":*" port.`;
        if (this.environment.logError) {
            this.environment.logError(message);
        } else {
            console.warn(message);
        }
    }

    private static ignoreProxy(requestUrl: string, excludeHostsForProxy: string[]): Boolean {
        if (!excludeHostsForProxy || excludeHostsForProxy.length === 0) {
            return false;
        }

        const resolvedUrl = url.parse(requestUrl);
        const hostName = resolvedUrl.hostname?.toLowerCase();
        const port = resolvedUrl.port;
        const excludeHostsProxyList = Array.from(new Set(excludeHostsForProxy.map(eh => eh.toLowerCase())));

        for (const eh of excludeHostsProxyList) {
            const urlParts = eh.split(":");
            if (!port) {
                // if no port specified in request url, host name must exactly match
                if (urlParts.length === 1 && urlParts[0] === hostName) {
                    return true;
                }
            } else {
                // if port specified, match host without port or hostname:port exactly match
                const [ph, pp] = urlParts;
                if (ph === hostName && (!pp || pp === port)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Warnings and the root for paths. Injecting them was the only thing
     * standing between this client and running outside VS Code.
     */
    private get environment(): EnvironmentData {
        return this._environment ?? EDITOR_ENVIRONMENT;
    }

    private resolveCertificate(absoluteOrRelativePath: string | undefined): Buffer | undefined {
        if (absoluteOrRelativePath === undefined) {
            return undefined;
        }

        if (path.isAbsolute(absoluteOrRelativePath)) {
            if (!fs.existsSync(absoluteOrRelativePath)) {
                this.environment.warn(`Certificate path ${absoluteOrRelativePath} doesn't exist, please make sure it exists.`);
                return undefined;
            } else {
                return fs.readFileSync(absoluteOrRelativePath);
            }
        }

        const resolved = resolveRelativePath(absoluteOrRelativePath, this.environment);
        if (resolved) {
            return fs.readFileSync(resolved);
        }

        this.environment.warn(`Certificate path ${absoluteOrRelativePath} doesn't exist, please make sure it exists.`);
        return undefined;
    }

    private static normalizeHeaderNames<T extends RequestHeaders | ResponseHeaders>(headers: T, rawHeaders: string[]): T {
        const headersDic: { [key: string]: string } = rawHeaders.reduce(
            (prev, cur) => {
                if (!(cur.toLowerCase() in prev)) {
                    prev[cur.toLowerCase()] = cur;
                }
                return prev;
            }, {});
        const adjustedResponseHeaders = {} as RequestHeaders | ResponseHeaders;
        for (const header in headers) {
            const adjustedHeaderName = headersDic[header] || header;
            adjustedResponseHeaders[adjustedHeaderName] = headers[header];
        }

        return adjustedResponseHeaders as T;
    }
}
