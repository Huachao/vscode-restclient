import * as fs from 'fs-extra';
import * as http from 'http';
import * as https from 'https';
import * as iconv from 'iconv-lite';
import fetch from 'node-fetch';
import * as path from 'path';
import { CookieJar, Store } from 'tough-cookie';
import * as url from 'url';
import { Uri, window } from 'vscode';
import { RequestHeaders, ResponseHeaders } from '../models/base';
import { IRestClientSettings, SystemSettings } from '../models/configurationSettings';
import { HttpRequest } from '../models/httpRequest';
import { HttpResponse } from '../models/httpResponse';
import Logger from '../logger';
import { awsCognito } from './auth/awsCognito';
import { awsSignature } from './auth/awsSignature';
import { digest } from './auth/digest';
import { MimeUtility } from './mimeUtility';
import { getHeader, hasHeader, removeHeader } from './misc';
import { convertBufferToStream, convertStreamToBuffer } from './streamUtility';
import { UserDataManager } from './userDataManager';
import { getCurrentHttpFileName, getWorkspaceRootPath } from './workspaceUtility';

import { CancelableRequest, Headers, Method, OptionsOfBufferResponseBody, Response } from 'got';
import got = require('got');

const encodeUrl = require('encodeurl');
const CookieFileStore = require('tough-cookie-file-store').FileCookieStore;

type Certificate = {
    cert?: Buffer;
    key?: Buffer;
    pfx?: Buffer;
    passphrase?: string;
};

export class HttpClient {
    private cookieStore: Store;

    public constructor() {
        const cookieFilePath = UserDataManager.cookieFilePath;
        this.cookieStore = new CookieFileStore(cookieFilePath) as Store;
    }

    public async send(httpRequest: HttpRequest, settings?: IRestClientSettings): Promise<HttpResponse> {
        settings = settings || SystemSettings.Instance;

        const options = await this.prepareOptions(httpRequest, settings);

        const sizes = { body: 0, headers: 0 };
        const requestUrl = encodeUrl(httpRequest.url);

        const executeRequest = async (opts: OptionsOfBufferResponseBody): Promise<Response<Buffer>> => {
            const request: CancelableRequest<Response<Buffer>> = got.default(requestUrl, opts);
            httpRequest.setUnderlyingRequest(request);
            (request as any).on('error', err => {
                Logger.verbose('HTTP request error', {
                    url: requestUrl,
                    code: err?.code,
                    message: err?.message
                });
            });
            (request as any).on('response', res => {
                if (res.rawHeaders) {
                    sizes.headers += res.rawHeaders.map(h => h.length).reduce((a, b) => a + b, 0);
                    sizes.headers += (res.rawHeaders.length) / 2;
                }
                res.on('data', chunk => {
                    sizes.body += chunk.length;
                });
                const req = (res as any).req;
                Logger.verbose('HTTP response socket', {
                    url: requestUrl,
                    reusedSocket: req?.reusedSocket,
                    localAddress: res.socket?.localAddress,
                    localPort: res.socket?.localPort,
                    remoteAddress: res.socket?.remoteAddress,
                    remotePort: res.socket?.remotePort,
                    bytesWritten: res.socket?.bytesWritten,
                    bytesRead: res.socket?.bytesRead
                });
            });

            try {
                return await request;
            } catch (err) {
                Logger.verbose('HTTP request failed', {
                    url: requestUrl,
                    code: err?.code,
                    message: err?.message
                });
                if (HttpClient.isConnectionResetError(err) && this.canFallbackToFetch(opts)) {
                    Logger.verbose('HTTP request fallback', {
                        url: requestUrl,
                        reason: err?.message || err?.code,
                        transport: 'node-fetch'
                    });
                    return await this.executeWithFetch(requestUrl, opts, httpRequest, settings!, sizes);
                }
                throw err;
            }
        };

        const response = await executeRequest(options);

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
            sizes.body,
            sizes.headers,
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
        if (originalRequestBody) {
            if (typeof originalRequestBody !== 'string') {
                requestBody = await convertStreamToBuffer(originalRequestBody);
            } else {
                requestBody = originalRequestBody;
            }
        }

        // Fix #682 Do not touch original headers in httpRequest, which may be used for retry later
        // Simply do a shadow copy here
        const clonedHeaders = Object.assign({}, httpRequest.headers);
        if (!hasHeader(clonedHeaders, 'Connection')) {
            clonedHeaders['Connection'] = 'close';
        }
        if ((typeof requestBody === 'string' || Buffer.isBuffer(requestBody))
            && !hasHeader(clonedHeaders, 'Content-Length')
            && !hasHeader(clonedHeaders, 'Transfer-Encoding')) {
            const length = typeof requestBody === 'string' ? Buffer.byteLength(requestBody) : requestBody.length;
            clonedHeaders['Content-Length'] = String(length);
        }

        const options: OptionsOfBufferResponseBody = {
            headers: clonedHeaders as any as Headers,
            method: httpRequest.method as any as Method,
            body: requestBody,
            responseType: 'buffer',
            decompress: true,
            followRedirect: settings.followRedirect,
            throwHttpErrors: false,
            retry: 0,
            hooks: {
                afterResponse: [],
                beforeRequest: [],
            },
            https: {
                rejectUnauthorized: false
            },
            http2: false
        };

        if (settings.timeoutInMilliseconds > 0) {
            options.timeout = settings.timeoutInMilliseconds;
        }

        if (settings.rememberCookiesForSubsequentRequests) {
            options.cookieJar = new CookieJar(this.cookieStore);
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
                    options.username = user;
                    options.password = pass;
                } else if (normalizedScheme === 'digest') {
                    removeHeader(options.headers!, 'Authorization');
                    options.hooks!.afterResponse!.push(digest(user, pass));
                } else if (normalizedScheme === 'aws') {
                    removeHeader(options.headers!, 'Authorization');
                    options.hooks!.beforeRequest!.push(awsSignature(authorization));
                } else if (normalizedScheme === 'cognito') {
                    removeHeader(options.headers!, 'Authorization');
                   options.hooks!.beforeRequest!.push(await awsCognito(authorization));
                }
            } else if (normalizedScheme === 'basic' && user.includes(':')) {
                removeHeader(options.headers!, 'Authorization');
                const [username, password] = user.split(':');
                options.username = username;
                options.password = password;
            }
        }

        // set certificate
        const certificate = this.getRequestCertificate(httpRequest.url, settings);
        Object.assign(options, certificate);

        const directAgent = {
            http: new http.Agent({ keepAlive: false }),
            https: new https.Agent({ keepAlive: false })
        };
        let usingProxy = false;
        // set proxy
        if (settings.proxy && !HttpClient.ignoreProxy(httpRequest.url, settings.excludeHostsForProxy)) {
            let proxyUrl = settings.proxy.trim();
            if (!proxyUrl.includes('://')) {
                proxyUrl = `http://${proxyUrl}`;
            }
            const proxyEndpoint = url.parse(proxyUrl);
            const proxyProtocol = (proxyEndpoint.protocol || '').toLowerCase();
            if (/^https?:$/.test(proxyProtocol)) {
                const proxyPort = proxyEndpoint.port
                    ? Number(proxyEndpoint.port)
                    : (proxyProtocol === 'https:' ? 443 : 80);
                if (proxyEndpoint.hostname && Number.isFinite(proxyPort)) {
                    const proxyOptions = {
                        host: proxyEndpoint.hostname,
                        port: proxyPort,
                        rejectUnauthorized: settings.proxyStrictSSL
                    };

                    const isHttps = httpRequest.url.startsWith('https:');
                    const ctor = (isHttps
                        ? await import('https-proxy-agent')
                        : await import('http-proxy-agent')).default;
                    const agent = new ctor(proxyOptions);
                    options.agent = isHttps ? { https: agent } : { http: agent };
                    usingProxy = true;
                }
            }
        }

        if (!usingProxy) {
            options.agent = directAgent;
        } else if (!hasHeader(clonedHeaders, 'Proxy-Connection')) {
            clonedHeaders['Proxy-Connection'] = 'close';
        }

        Logger.verbose('HTTP request options', {
            method: options.method,
            url: httpRequest.url,
            usingProxy,
            proxyConfigured: Boolean(settings.proxy),
            ignoreProxy: settings.proxy ? HttpClient.ignoreProxy(httpRequest.url, settings.excludeHostsForProxy) : true,
            agent: HttpClient.describeAgent(options.agent),
            headers: HttpClient.pickHeaders(options.headers as Record<string, unknown>),
            timeout: options.timeout
        });

        return options;
    }

    private static describeAgent(agent: OptionsOfBufferResponseBody['agent']): string {
        if (agent === false) {
            return 'disabled';
        }
        if (!agent) {
            return 'default';
        }
        const agentAny: any = agent;
        if (agentAny.http || agentAny.https) {
            const httpAgent = agentAny.http;
            const httpsAgent = agentAny.https;
            return `http:${HttpClient.agentLabel(httpAgent)} https:${HttpClient.agentLabel(httpsAgent)}`;
        }
        return HttpClient.agentLabel(agentAny);
    }

    private static agentLabel(agent: any): string {
        if (!agent) {
            return 'none';
        }
        const name = agent.constructor?.name || 'Agent';
        const keepAlive = agent?.options?.keepAlive;
        return `${name}(keepAlive=${keepAlive ?? 'unknown'})`;
    }

    private static pickHeaders(headers: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
        if (!headers) {
            return undefined;
        }
        const allow = ['connection', 'proxy-connection', 'content-type', 'content-length', 'user-agent', 'host'];
        const picked: Record<string, unknown> = {};
        for (const key of Object.keys(headers)) {
            if (allow.includes(key.toLowerCase())) {
                picked[key] = headers[key];
            }
        }
        return picked;
    }

    private static isConnectionResetError(err: any): boolean {
        if (!err) {
            return false;
        }
        if (err.code === 'ECONNRESET') {
            return true;
        }
        return typeof err.message === 'string' && err.message.includes('socket hang up');
    }

    private canFallbackToFetch(options: OptionsOfBufferResponseBody): boolean {
        const hooks = options.hooks;
        if (hooks?.afterResponse && hooks.afterResponse.length > 0) {
            return false;
        }
        return true;
    }

    private async executeWithFetch(
        requestUrl: string,
        options: OptionsOfBufferResponseBody,
        httpRequest: HttpRequest,
        settings: IRestClientSettings,
        sizes: { body: number; headers: number }
    ): Promise<Response<Buffer>> {
        if (options.hooks?.beforeRequest?.length) {
            for (const hook of options.hooks.beforeRequest) {
                await (hook as any)(options);
            }
        }

        const controller = new AbortController();
        httpRequest.setUnderlyingRequest({ cancel: () => controller.abort() } as any);

        const fetchHeaders: Record<string, string> = {};
        if (options.headers) {
            for (const [key, value] of Object.entries(options.headers)) {
                if (value === undefined) {
                    continue;
                }
                fetchHeaders[key] = Array.isArray(value) ? value.join(', ') : String(value);
            }
        }

        if (options.cookieJar) {
            try {
                const jarCookie = await (options.cookieJar as any).getCookieString(requestUrl);
                const existingCookie = getHeader(fetchHeaders as any, 'Cookie') as string | undefined;
                const combined = [jarCookie, existingCookie].filter(Boolean).join('; ');
                if (combined) {
                    fetchHeaders['Cookie'] = combined;
                }
            } catch (err) {
                Logger.verbose('HTTP cookie jar read failed', {
                    url: requestUrl,
                    message: err?.message
                });
            }
        }

        const timeout = typeof options.timeout === 'number'
            ? options.timeout
            : (options.timeout as any)?.request;

        const agentSelector = (parsedUrl: URL) => {
            const agent: any = options.agent;
            if (!agent || agent === false) {
                return undefined;
            }
            if (agent.http || agent.https) {
                return parsedUrl.protocol === 'https:' ? agent.https : agent.http;
            }
            return agent;
        };

        const fetchResponse: any = await fetch(requestUrl, {
            method: options.method as string,
            headers: fetchHeaders,
            body: options.body as any,
            redirect: settings.followRedirect ? 'follow' : 'manual',
            compress: options.decompress,
            timeout,
            agent: agentSelector,
            signal: controller.signal
        } as any);

        const bodyBuffer = await fetchResponse.buffer();

        if (options.cookieJar) {
            const rawSetCookies = fetchResponse.headers?.raw?.()['set-cookie'] || [];
            for (const cookie of rawSetCookies) {
                try {
                    await (options.cookieJar as any).setCookie(cookie, requestUrl);
                } catch (err) {
                    Logger.verbose('HTTP cookie jar write failed', {
                        url: requestUrl,
                        message: err?.message
                    });
                }
            }
        }

        const rawHeaderMap: Record<string, string[]> = fetchResponse.headers?.raw?.() || {};
        const rawHeaders: string[] = [];
        const headers: Record<string, string> = {};
        for (const [name, values] of Object.entries(rawHeaderMap)) {
            headers[name] = values.join(', ');
            for (const value of values) {
                rawHeaders.push(name, value);
            }
        }

        sizes.body = bodyBuffer.length;
        sizes.headers = rawHeaders.reduce((sum, item) => sum + item.length, 0) + (rawHeaders.length / 2);

        return {
            statusCode: fetchResponse.status,
            statusMessage: fetchResponse.statusText || '',
            httpVersion: '1.1',
            headers,
            rawHeaders,
            body: bodyBuffer,
            timings: { phases: {} as any },
            request: {
                options: {
                    headers: options.headers
                }
            }
        } as Response<Buffer>;
    }

    private decodeEscapedUnicodeCharacters(body: string): string {
        return body.replace(/\\u([0-9a-fA-F]{4})/gi, (_, g) => {
            const char = String.fromCharCode(parseInt(g, 16));
            return char === '"' ? '\\"' : char;
        });
    }

    private getRequestCertificate(requestUrl: string, settings: IRestClientSettings): Certificate | null {
        const host = url.parse(requestUrl).host;
        if (!host || !(host in settings.hostCertificates)) {
            return null;
        }

        const { cert: certPath, key: keyPath, pfx: pfxPath, passphrase } = settings.hostCertificates[host];
        const cert = this.resolveCertificate(certPath);
        const key = this.resolveCertificate(keyPath);
        const pfx = this.resolveCertificate(pfxPath);
        return { cert, key, pfx, passphrase };
    }

    private static ignoreProxy(requestUrl: string, excludeHostsForProxy: string[]): Boolean {
        const resolvedUrl = url.parse(requestUrl);
        const hostName = resolvedUrl.hostname?.toLowerCase();
        if (!hostName) {
            return true;
        }

        if (HttpClient.isPrivateHost(hostName)) {
            return true;
        }

        if (!excludeHostsForProxy || excludeHostsForProxy.length === 0) {
            return false;
        }

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

    private static isPrivateHost(hostName: string): boolean {
        if (hostName === 'localhost' || hostName === '::1' || hostName.endsWith('.local')) {
            return true;
        }

        const parts = hostName.split('.');
        if (parts.length !== 4) {
            return false;
        }

        const nums = parts.map(part => Number(part));
        if (nums.some(n => !Number.isInteger(n) || n < 0 || n > 255)) {
            return false;
        }

        const [first, second] = nums;
        if (first === 10 || first === 127) {
            return true;
        }

        if (first === 192 && second === 168) {
            return true;
        }

        if (first === 172 && second >= 16 && second <= 31) {
            return true;
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
