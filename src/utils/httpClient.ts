import * as fs from 'fs-extra';
import * as iconv from 'iconv-lite';
import * as path from 'path';
import * as crypto from 'crypto';
import { Cookie, CookieJar, Store } from 'tough-cookie';
import * as url from 'url';
import { Uri, window } from 'vscode';
import Logger from '../logger';
import { RequestHeaders, ResponseHeaders } from '../models/base';
import { IRestClientSettings, SystemSettings } from '../models/configurationSettings';
import { HttpRequest } from '../models/httpRequest';
import { HttpResponse } from '../models/httpResponse';
import { awsSignature } from './auth/awsSignature';
import { digest } from './auth/digest';
import { MimeUtility } from './mimeUtility';
import { getHeader, hasHeader, removeHeader } from './misc';
import { convertBufferToStream, convertStreamToBuffer } from './streamUtility';
import { UserDataManager } from './userDataManager';
import { getCurrentHttpFileName, getWorkspaceRootPath } from './workspaceUtility';

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
    private readonly cookieStore: Store;

    public constructor() {
        const cookieFilePath = UserDataManager.cookieFilePath;
        this.cookieStore = new cookieStore(cookieFilePath) as Store;
    }

    public async send(httpRequest: HttpRequest, settings?: IRestClientSettings): Promise<HttpResponse> {
        settings = settings || SystemSettings.Instance;

        this.processUrlSign(httpRequest, settings);

        const options = await this.prepareOptions(httpRequest, settings);

        let bodySize = 0;
        let headersSize = 0;
        const requestUrl = encodeUrl(httpRequest.url);
        const request: got.GotPromise<Buffer> = got(requestUrl, options);
        httpRequest.setUnderlyingRequest(request);
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

        if (settings.decodeEscapedUnicodeCharacters) {
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
                Buffer.isBuffer(requestBody) ? convertBufferToStream(requestBody) : requestBody,
                httpRequest.rawBody,
                httpRequest.name
            ));
    }

    private processUrlSign(httpRequest: HttpRequest, settings: IRestClientSettings) {
        const conf = settings.urlSignConfiguration;
        const keySecrets = settings.urlSignKeySecrets;
        const algo = conf.algorithm;
        const httpMethod = httpRequest.method;

        if (!conf.enableUrlSign) {
            return;
        }

        // Step 1: Canonicalized Query String
        let urlObj = new url.URL(httpRequest.url);
        let searchParams = urlObj.searchParams;

        let secret = '';
        let pairArr: Array<[string, string]> = [];

        if (algo.step1OrderParams) {
            searchParams.sort();
        }

        for (const [key, value] of searchParams) {
            if (key === conf.keyParamName) {
                for (let k in  keySecrets) {
                    let s = keySecrets[k];
                    if (k === value) {
                        secret = s;
                    }
                }
            }

            var encodeValue = value;
            if (algo.step1UrlEncodeParams) {
                encodeValue = encodeURIComponent(value);
            }
            if (algo.step1PercentEncode) {
                encodeValue = this.percentEncode(encodeValue);
            }

            if (key !== conf.signParamName) {
                pairArr.push([key, encodeValue]);
            }
        }

        let joinSeparator = '';
        if (algo.step1AddAnd) {
            joinSeparator = '&';
        }

        let canonicalizedQueryString = pairArr.map(x => {
            let pairSeparator = '';
            if (algo.step1AddEqual) {
                pairSeparator = '=';
            }
            return x[0] + pairSeparator + x[1];
        }).join(joinSeparator);

        Logger.verbose("canonicalizedQueryString: " + canonicalizedQueryString);
        Logger.verbose("secret: " + secret);

        if (secret === '') {
            Logger.warn("No secret setted, please set it in plugin configuration: Url Sign Key Secrets!");
        }

        // Step 2: Construct StringToSign
        let signArr: Array<string> = [];
        if (algo.step2AddHttpMethod) {
            signArr.push(httpMethod);
        }
        if (algo.step2AddPercentEncodeSlash) {
            signArr.push(encodeURIComponent('/'));
        }
        let encodeStr = canonicalizedQueryString;
        if (algo.step2PercentEncode) {
            encodeStr = this.percentEncode(encodeURIComponent(canonicalizedQueryString));
        }
        signArr.push(encodeStr);

        let step2JoinSeparator = '';
        if (algo.step2SeparatorAnd) {
            step2JoinSeparator = '&';
        }

        let stringToSign = signArr.join(step2JoinSeparator);
        Logger.verbose("stringToSign: " + stringToSign);

        // Step 3: Compute signature
        let computeSign: string = '';
        let signSecret = secret + algo.step3SecretAppend;
        if (algo.step3ComputeAlgorithm === 'hmacsha1') {
            let hmac = crypto.createHmac('sha1', signSecret).update(stringToSign);

            if (algo.step3TextAlgorithm === 'base64') {
                computeSign = hmac.digest('base64');
            } else {
                // Default hex
                computeSign = hmac.digest('hex');
            }
        } else {
            // Default md5
            let hash = crypto.createHash('md5').update(stringToSign + signSecret);

            if (algo.step3TextAlgorithm === 'base64') {
                computeSign = hash.digest('base64');
            } else {
                // Default hex
                computeSign = hash.digest('hex');
            }
        }
        Logger.verbose("computeSign: " + computeSign);

        searchParams.set(conf.signParamName, computeSign);

        Logger.info("Request URL: " + urlObj.toString());
        httpRequest.url = urlObj.toString();
    }

    private percentEncode(s: string): string {
        return s.replace(/\+/g, "%20").replace(/\*/g, "%2A").replace(/\%7E/g, "~");
    }

    private async prepareOptions(httpRequest: HttpRequest, settings: IRestClientSettings): Promise<got.GotBodyOptions<null>> {
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
        const options: got.GotBodyOptions<null> = {
            headers: clonedHeaders,
            method: httpRequest.method,
            body: requestBody,
            encoding: null,
            decompress: true,
            followRedirect: settings.followRedirect,
            rejectUnauthorized: false,
            throwHttpErrors: false,
            cookieJar: settings.rememberCookiesForSubsequentRequests ? new CookieJar(this.cookieStore, { rejectPublicSuffixes: false }) : undefined,
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
                ],
                beforeRequest: [],
            }
        };

        if (settings.timeoutInMilliseconds > 0) {
            options.timeout = settings.timeoutInMilliseconds;
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
                } else if (normalizedScheme === 'aws') {
                    removeHeader(options.headers!, 'Authorization');
                    options.hooks!.beforeRequest!.push(awsSignature(authorization));
                }
            } else if (normalizedScheme === 'basic' && user.includes(':')) {
                removeHeader(options.headers!, 'Authorization');
                options.auth = user;
            }
        }

        // set certificate
        const certificate = this.getRequestCertificate(httpRequest.url, settings);
        Object.assign(options, certificate);

        // set proxy
        if (settings.proxy && !HttpClient.ignoreProxy(httpRequest.url, settings.excludeHostsForProxy)) {
            const proxyEndpoint = url.parse(settings.proxy);
            if (/^https?:$/.test(proxyEndpoint.protocol || '')) {
                const proxyOptions = {
                    host: proxyEndpoint.hostname,
                    port: Number(proxyEndpoint.port),
                    rejectUnauthorized: settings.proxyStrictSSL
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
