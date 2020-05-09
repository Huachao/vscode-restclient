import * as fs from 'fs-extra';
import * as iconv from 'iconv-lite';
import * as path from 'path';
import { Readable, Stream } from 'stream';
import { Cookie, CookieJar, Store } from 'tough-cookie';
import * as url from 'url';
import { Uri, window } from 'vscode';
import { RequestHeaders, ResponseHeaders } from '../models/base';
import { RestClientSettings } from '../models/configurationSettings';
import { HttpRequest } from '../models/httpRequest';
import { HttpResponse } from '../models/httpResponse';
import { digest } from './auth/digest';
import { MimeUtility } from './mimeUtility';
import { extractHeader, getHeader, hasHeader, removeHeader } from './misc';
import { UserDataManager } from './userDataManager';
import { getCurrentHttpFileName, getWorkspaceRootPath } from './workspaceUtility';

import aws4 = require('aws4');
import got = require('got');

const encodeUrl = require('encodeurl');
const cookieStore = require('tough-cookie-file-store-bugfix');

type SetCookieCallback = (err: Error | null, cookie: Cookie) => void;
type SetCookieCallbackWithoutOptions = (err: Error, cookie: Cookie) => void;
type GetCookieStringCallback = (err: Error | null, cookies: string) => void;
type Certificate = {
    cert?: Buffer;
    key?: Buffer;
    pfx?: Buffer;
    passphrase?: string;
};

export class HttpClient {
    private readonly _settings: RestClientSettings = RestClientSettings.Instance;

    private readonly cookieStore: Store;

    public constructor() {
        const cookieFilePath = UserDataManager.cookieFilePath;
        this.cookieStore = new cookieStore(cookieFilePath) as Store;
    }

    public async send(httpRequest: HttpRequest): Promise<HttpResponse> {
        const options = await this.prepareOptions(httpRequest);

        let bodySize = 0;
        let headersSize = 0;
        const requestUrl = encodeUrl(httpRequest.url);
        const request = got(requestUrl, options);
        (request as any).on('response', res => {
            if (res.rawHeaders) {
                headersSize += res.rawHeaders.map(h => h.length).reduce((a, b) => a + b, 0);
                headersSize += (res.rawHeaders.length) / 2;
            }
            res.on('data', chunk => {
                bodySize += chunk.length;
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

        if (this._settings.decodeEscapedUnicodeCharacters) {
            bodyString = this.decodeEscapedUnicodeCharacters(bodyString);
        }

        // adjust response header case, due to the response headers in nodejs http module is in lowercase
        const responseHeaders: ResponseHeaders = HttpClient.normalizeHeaderNames(response.headers, response.rawHeaders);

        const requestBody = options.body;

        return new HttpResponse(
            response.statusCode,
            response.statusMessage,
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
                    (response as any).request.gotOptions.headers as RequestHeaders,
                    Object.keys(httpRequest.headers)),
                Buffer.isBuffer(requestBody) ? this.convertBufferToStream(requestBody) : requestBody,
                httpRequest.rawBody,
                httpRequest.name
            ));
    }

    private async prepareOptions(httpRequest: HttpRequest): Promise<got.GotBodyOptions<null>> {
        const originalRequestBody = httpRequest.body;
        let requestBody: string | Buffer | undefined;
        if (originalRequestBody) {
            if (typeof originalRequestBody !== 'string') {
                requestBody = await this.convertStreamToBuffer(originalRequestBody);
            } else {
                requestBody = originalRequestBody;
            }
        }

        const options: got.GotBodyOptions<null> = {
            headers: httpRequest.headers,
            method: httpRequest.method,
            body: requestBody,
            encoding: null,
            decompress: true,
            followRedirect: this._settings.followRedirect,
            rejectUnauthorized: false,
            throwHttpErrors: false,
            cookieJar: this._settings.rememberCookiesForSubsequentRequests ? new CookieJar(this.cookieStore, { rejectPublicSuffixes: false }) : undefined,
            retry: 0,
            hooks: {
                afterResponse: [],
                // Following port reset on redirect can be removed after upgrade got to version 10.0
                // https://github.com/sindresorhus/got/issues/719
                beforeRedirect: [
                    opts => {
                        const redirectHost = ((opts as any).href as string).split('/')[2];
                        if (!redirectHost.includes(':')) {
                            delete opts.port;
                        }
                    }
                ]
            }
        };

        if (this._settings.timeoutInMilliseconds > 0) {
            options.timeout = this._settings.timeoutInMilliseconds;
        }

        // TODO: refactor auth
        const authorization = getHeader(options.headers!, 'Authorization') as string | undefined;
        if (authorization) {
            const [scheme, user, ...args] = authorization.split(/\s+/);
            const normalizedScheme = scheme.toLowerCase();
            if (args.length > 0) {
                const pass = args.join(' ');
                if (normalizedScheme === 'basic') {
                    removeHeader(options.headers!, 'Authorization');
                    options.auth = `${user}:${pass}`;
                } else if (normalizedScheme === 'digest') {
                    removeHeader(options.headers!, 'Authorization');
                    options.hooks!.afterResponse!.push(digest(user, pass));
                }
            } else if (normalizedScheme === 'basic' && user.includes(':')) {
                removeHeader(options.headers!, 'Authorization');
                options.auth = user;
            }
        }

        // set AWS authentication
        const xAuthentication = extractHeader(options.headers!, 'X-Authentication-Type') as string | undefined;
        if (xAuthentication) {
            const [ xAuthenticationType, ...rawCredentials ] = xAuthentication.split(" ");
            if (xAuthenticationType === 'AWS' ) {
                const credentials = {
                    accessKeyId: rawCredentials[0],
                    secretAccessKey: rawCredentials[1],
                    sessionToken: rawCredentials[2]
                };

                const awsScope: { [key: string]: string } = {};
                const region = extractHeader(options.headers!, 'X-AWS-Region') as string | undefined;
                if (region) { awsScope.region = region; }
                const service = extractHeader(options.headers!, 'X-AWS-Service') as string | undefined;
                if (service) { awsScope.service = service; }

                options.hooks!["beforeRequest"] = [
                    async options => {
                        aws4.sign({ ...options, ...awsScope }, credentials);
                    }
                ];
            }
        }

        // set certificate
        const certificate = this.getRequestCertificate(httpRequest.url);
        Object.assign(options, certificate);

        // set proxy
        if (this._settings.proxy && !HttpClient.ignoreProxy(httpRequest.url, this._settings.excludeHostsForProxy)) {
            const proxyEndpoint = url.parse(this._settings.proxy);
            if (/^https?:$/.test(proxyEndpoint.protocol || '')) {
                const proxyOptions = {
                    host: proxyEndpoint.hostname,
                    port: Number(proxyEndpoint.port),
                    rejectUnauthorized: this._settings.proxyStrictSSL
                };

                const ctor = (httpRequest.url.startsWith('http:')
                    ? await import('http-proxy-agent')
                    : await import('https-proxy-agent')).default;

                options.agent = new ctor(proxyOptions);
            }
        }

        // set cookie jar
        if (options.cookieJar) {
            const { getCookieString: originalGetCookieString, setCookie: originalSetCookie } = options.cookieJar;

            function _setCookie(cookieOrString: Cookie | string, currentUrl: string, opts: CookieJar.SetCookieOptions, cb: SetCookieCallback): void;
            function _setCookie(cookieOrString: Cookie | string, currentUrl: string, cb: SetCookieCallbackWithoutOptions): void;
            function _setCookie(cookieOrString: Cookie | string, currentUrl: string, opts: CookieJar.SetCookieOptions | SetCookieCallbackWithoutOptions, cb?: SetCookieCallback): void {
                if (opts instanceof Function) {
                    cb = opts;
                    opts = {};
                }
                opts.ignoreError = true;
                originalSetCookie.call(options.cookieJar, cookieOrString, currentUrl, opts, cb!);
            }
            options.cookieJar.setCookie = _setCookie;

            if (hasHeader(options.headers!, 'cookie')) {
                let count = 0;

                function _getCookieString(currentUrl: string, opts: CookieJar.GetCookiesOptions, cb: GetCookieStringCallback): void;
                function _getCookieString(currentUrl: string, cb: GetCookieStringCallback): void;
                function _getCookieString(currentUrl: string, opts: CookieJar.GetCookiesOptions | GetCookieStringCallback, cb?: GetCookieStringCallback): void {
                    if (opts instanceof Function) {
                        cb = opts;
                        opts = {};
                    }

                    originalGetCookieString.call(options.cookieJar, currentUrl, opts, (err, cookies) => {
                        if (err || count > 0 || !cookies) {
                            cb!(err, cookies);
                        }

                        count++;
                        cb!(null, [cookies, getHeader(options.headers!, 'cookie')].filter(Boolean).join('; '));
                    });
                }
                options.cookieJar.getCookieString = _getCookieString;
            }
        }

        return options;
    }

    private async convertStreamToBuffer(stream: Stream): Promise<Buffer> {
        return new Promise<Buffer>((resolve, reject) => {
            const buffers: Buffer[] = [];
            stream.on('data', buffer => buffers.push(typeof buffer === 'string' ? Buffer.from(buffer) : buffer));
            stream.on('end', () => resolve(Buffer.concat(buffers)));
            stream.on('error', error => reject(error));
            (<any>stream).resume();
        });
    }

    private convertBufferToStream(buffer: Buffer): Stream {
        return new Readable({
            read() {
                this.push(buffer);
                this.push(null);
            }
        });
    }

    private decodeEscapedUnicodeCharacters(body: string): string {
        return body.replace(/\\u([\d\w]{4})/gi, (_, g) => String.fromCharCode(parseInt(g, 16)));
    }

    private getRequestCertificate(requestUrl: string): Certificate | null {
        const host = url.parse(requestUrl).host;
        if (!host || !(host in this._settings.hostCertificates)) {
            return null;
        }

        const { cert: certPath, key: keyPath, pfx: pfxPath, passphrase } = this._settings.hostCertificates[host];
        const cert = this.resolveCertificate(certPath);
        const key = this.resolveCertificate(keyPath);
        const pfx = this.resolveCertificate(pfxPath);
        return { cert, key, pfx, passphrase };
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

    private resolveCertificate(absoluteOrRelativePath: string | undefined): Buffer | undefined {
        if (absoluteOrRelativePath === undefined) {
            return undefined;
        }

        if (path.isAbsolute(absoluteOrRelativePath)) {
            if (!fs.existsSync(absoluteOrRelativePath)) {
                window.showWarningMessage(`Certificate path ${absoluteOrRelativePath} doesn't exist, please make sure it exists.`);
                return undefined;
            } else {
                return fs.readFileSync(absoluteOrRelativePath);
            }
        }

        // the path should be relative path
        const rootPath = getWorkspaceRootPath();
        let absolutePath = '';
        if (rootPath) {
            absolutePath = path.join(Uri.parse(rootPath).fsPath, absoluteOrRelativePath);
            if (fs.existsSync(absolutePath)) {
                return fs.readFileSync(absolutePath);
            } else {
                window.showWarningMessage(`Certificate path ${absoluteOrRelativePath} doesn't exist, please make sure it exists.`);
                return undefined;
            }
        }

        const currentFilePath = getCurrentHttpFileName();
        if (!currentFilePath) {
            return undefined;
        }

        absolutePath = path.join(path.dirname(currentFilePath), absoluteOrRelativePath);
        if (fs.existsSync(absolutePath)) {
            return fs.readFileSync(absolutePath);
        } else {
            window.showWarningMessage(`Certificate path ${absoluteOrRelativePath} doesn't exist, please make sure it exists.`);
            return undefined;
        }
    }

    private static normalizeHeaderNames<T extends RequestHeaders | ResponseHeaders>(headers: T, rawHeaders: string[]): T {
        const headersDic: { [key: string]: string } = rawHeaders.reduce(
            (prev, cur) => {
                prev[cur.toLowerCase()] = cur;
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
