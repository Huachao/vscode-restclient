import * as fs from 'fs-extra';
import * as iconv from 'iconv-lite';
import * as path from 'path';
import { Readable, Stream } from 'stream';
import { CookieJar } from 'tough-cookie';
import * as url from 'url';
import { Uri, window } from 'vscode';
import { RequestHeaders, ResponseHeaders } from '../models/base';
import { RestClientSettings } from '../models/configurationSettings';
import { HostCertificate } from '../models/hostCertificate';
import { HttpRequest } from '../models/httpRequest';
import { HttpResponse } from '../models/httpResponse';
import { HttpResponseTimingPhases } from '../models/httpResponseTimingPhases';
import { digest } from './auth/digest';
import { MimeUtility } from './mimeUtility';
import { base64, getHeader, hasHeader, removeHeader } from './misc';
import { PersistUtility } from './persistUtility';
import { getCurrentHttpFileName, getWorkspaceRootPath } from './workspaceUtility';

import got = require('got');

const encodeUrl = require('encodeurl');
const cookieStore = require('tough-cookie-file-store-bugfix');

export class HttpClient {
    private readonly _settings: RestClientSettings = RestClientSettings.Instance;

    private readonly cookieJar: CookieJar;

    public constructor() {
        PersistUtility.ensureCookieFile();
        this.cookieJar = new CookieJar(new cookieStore(PersistUtility.cookieFilePath));
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
            new HttpResponseTimingPhases(
                response.timings.phases.total || 0,
                response.timings.phases.wait || 0,
                response.timings.phases.dns || 0,
                response.timings.phases.tcp || 0,
                response.timings.phases.request || 0,
                response.timings.phases.firstByte || 0,
                response.timings.phases.download || 0
            ),
            new HttpRequest(
                options.method!,
                requestUrl,
                HttpClient.normalizeHeaderNames(
                    (response as any).request.gotOptions.headers as RequestHeaders,
                    Object.keys(httpRequest.headers)),
                Buffer.isBuffer(requestBody) ? this.convertBufferToStream(requestBody) : requestBody,
                httpRequest.rawBody,
                httpRequest.requestVariableCacheKey
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
            retry: 0,
            hooks: {
                beforeRequest: [
                    opts => {
                        if (this._settings.rememberCookiesForSubsequentRequests) {
                            const cookieString = this.cookieJar.getCookieStringSync(httpRequest.url, { expire: true });
                            if (cookieString) {
                                opts.headers!.cookie = [cookieString, getHeader(httpRequest.headers, 'cookie')].filter(Boolean).join('; ');
                            }
                        }

                    }
                ],
                afterResponse: [
                    res => {
                        if (this._settings.rememberCookiesForSubsequentRequests) {
                            const setCookie = getHeader(res.headers, 'set-cookie') as string[] | undefined;
                            setCookie?.map(rawCookie => this.cookieJar.setCookieSync(rawCookie, res.url, { ignoreError: true }));
                        }
                        return res;
                    }
                ],
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

        if (!options.headers) {
            options.headers = httpRequest.headers = {};
        }

        // TODO: refactor auth
        const authorization = getHeader(options.headers, 'Authorization') as string | undefined;
        if (authorization) {
            const [scheme, user, ...args] = authorization.split(/\s+/);
            if (args.length > 0) {
                const pass = args.join(' ');
                if (scheme === 'Basic') {
                    removeHeader(options.headers, 'Authorization');
                    options.headers!['Authorization'] = `Basic ${base64(`${user}:${pass}`)}`;
                } else if (scheme === 'Digest') {
                    removeHeader(options.headers, 'Authorization');
                    options.hooks!.afterResponse!.push(digest(user, pass));
                }
            }
        }

        // set certificate
        const certificate = this.getRequestCertificate(httpRequest.url);
        if (certificate) {
            options.cert = certificate.cert;
            options.key = certificate.key;
            options.pfx = certificate.pfx;
            options.passphrase = certificate.passphrase;
        }

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

        // add default headers if not specified
        for (const header in this._settings.defaultHeaders) {
            if (!hasHeader(options.headers, header) && (header.toLowerCase() !== 'host' || httpRequest.url[0] === '/')) {
                const value = this._settings.defaultHeaders[header];
                if (value) {
                    options.headers[header] = value;
                }
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

    private getRequestCertificate(requestUrl: string): HostCertificate | null {
        const host = url.parse(requestUrl).host;
        if (!host) {
            return null;
        }

        if (host in this._settings.hostCertificates) {
            const certificate = this._settings.hostCertificates[host];
            let cert: Buffer | undefined,
                key: Buffer | undefined,
                pfx: Buffer | undefined;
            if (certificate.cert) {
                const certPath = HttpClient.resolveCertificateFullPath(certificate.cert, "cert");
                if (certPath) {
                    cert = fs.readFileSync(certPath);
                }
            }
            if (certificate.key) {
                const keyPath = HttpClient.resolveCertificateFullPath(certificate.key, "key");
                if (keyPath) {
                    key = fs.readFileSync(keyPath);
                }
            }
            if (certificate.pfx) {
                const pfxPath = HttpClient.resolveCertificateFullPath(certificate.pfx, "pfx");
                if (pfxPath) {
                    pfx = fs.readFileSync(pfxPath);
                }
            }
            return new HostCertificate(cert, key, pfx, certificate.passphrase);
        }

        return null;
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

    private static resolveCertificateFullPath(absoluteOrRelativePath: string, certName: string): string | undefined {
        if (path.isAbsolute(absoluteOrRelativePath)) {
            if (!fs.existsSync(absoluteOrRelativePath)) {
                window.showWarningMessage(`Certificate path ${absoluteOrRelativePath} of ${certName} doesn't exist, please make sure it exists.`);
                return undefined;
            } else {
                return absoluteOrRelativePath;
            }
        }

        // the path should be relative path
        const rootPath = getWorkspaceRootPath();
        let absolutePath = '';
        if (rootPath) {
            absolutePath = path.join(Uri.parse(rootPath).fsPath, absoluteOrRelativePath);
            if (fs.existsSync(absolutePath)) {
                return absolutePath;
            } else {
                window.showWarningMessage(`Certificate path ${absoluteOrRelativePath} of ${certName} doesn't exist, please make sure it exists.`);
                return undefined;
            }
        }

        const currentFilePath = getCurrentHttpFileName();
        if (!currentFilePath) {
            return undefined;
        }

        absolutePath = path.join(path.dirname(currentFilePath), absoluteOrRelativePath);
        if (fs.existsSync(absolutePath)) {
            return absolutePath;
        } else {
            window.showWarningMessage(`Certificate path ${absoluteOrRelativePath} of ${certName} doesn't exist, please make sure it exists.`);
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
