"use strict";

import * as fs from 'fs-extra';
import * as iconv from 'iconv-lite';
import * as path from 'path';
import { Stream } from 'stream';
import * as url from 'url';
import { Uri, window } from 'vscode';
import { Headers } from '../models/base';
import { RestClientSettings } from '../models/configurationSettings';
import { HostCertificate } from '../models/hostCertificate';
import { HttpRequest } from '../models/httpRequest';
import { HttpResponse } from '../models/httpResponse';
import { HttpResponseTimingPhases } from '../models/httpResponseTimingPhases';
import { MimeUtility } from './mimeUtility';
import { getHeader, hasHeader } from './misc';
import { PersistUtility } from './persistUtility';
import { getWorkspaceRootPath } from './workspaceUtility';

const encodeUrl = require('encodeurl');
const request = require('request');
const cookieStore = require('tough-cookie-file-store-bugfix');

export class HttpClient {
    private readonly _settings: RestClientSettings = RestClientSettings.Instance;

    public constructor() {
        PersistUtility.ensureCookieFile();
    }

    public async send(httpRequest: HttpRequest): Promise<HttpResponse> {
        const options = await this.prepareOptions(httpRequest);

        let size = 0;
        let headersSize = 0;
        return new Promise<HttpResponse>((resolve, reject) => {
            const that = this;
            request(options, function (error, response, body) {
                if (error) {
                    if (error.message) {
                        if (error.message.startsWith("Header name must be a valid HTTP Token")) {
                            error.message = "Header must be in 'header name: header value' format, "
                                + "please also make sure there is a blank line between headers and body";
                        }
                    }
                    reject(error);
                    return;
                }

                let contentType = getHeader(response.headers, 'Content-Type');
                let encoding: string;
                if (contentType) {
                    encoding = MimeUtility.parse(contentType).charset;
                }

                if (!encoding) {
                    encoding = "utf8";
                }

                const bodyBuffer: Buffer = Buffer.isBuffer(body) ? body : Buffer.from(body);
                let bodyString: string;
                try {
                    bodyString = iconv.decode(bodyBuffer, encoding);
                } catch {
                    if (encoding !== 'utf8') {
                        bodyString = iconv.decode(bodyBuffer, 'utf8');
                    }
                }

                if (that._settings.decodeEscapedUnicodeCharacters) {
                    bodyString = that.decodeEscapedUnicodeCharacters(bodyString);
                }

                // adjust response header case, due to the response headers in request package is in lowercase
                let headersDic = HttpClient.getResponseRawHeaderNames(response.rawHeaders);
                let adjustedResponseHeaders: Headers = {};
                for (let header in response.headers) {
                    let adjustedHeaderName = header;
                    if (headersDic[header]) {
                        adjustedHeaderName = headersDic[header];
                        adjustedResponseHeaders[headersDic[header]] = response.headers[header];
                    }
                    adjustedResponseHeaders[adjustedHeaderName] = response.headers[header];
                }

                const requestBody = options.body;

                resolve(new HttpResponse(
                    response.statusCode,
                    response.statusMessage,
                    response.httpVersion,
                    adjustedResponseHeaders,
                    bodyString,
                    response.elapsedTime,
                    size,
                    headersSize,
                    bodyBuffer,
                    new HttpResponseTimingPhases(
                        response.timingPhases.total,
                        response.timingPhases.wait,
                        response.timingPhases.dns,
                        response.timingPhases.tcp,
                        response.timingPhases.firstByte,
                        response.timingPhases.download
                    ),
                    new HttpRequest(
                        options.method,
                        options.url,
                        HttpClient.capitalizeHeaderName(response.toJSON().request.headers),
                        Buffer.isBuffer(requestBody) ? fs.createReadStream(requestBody) : requestBody,
                        httpRequest.rawBody
                    )));
            })
                .on('data', function (data) {
                    size += data.length;
                })
                .on('response', function (response) {
                    if (response.rawHeaders) {
                        headersSize += response.rawHeaders.map(h => h.length).reduce((a, b) => a + b, 0);
                        headersSize += (response.rawHeaders.length) / 2;
                    }
                });
        });
    }

    private async prepareOptions(httpRequest: HttpRequest): Promise<{ [key: string]: any }> {
        const originalRequestBody = httpRequest.body;
        let requestBody: string | Buffer;
        if (originalRequestBody) {
            if (typeof originalRequestBody !== 'string') {
                requestBody = await this.convertStreamToBuffer(originalRequestBody);
            } else {
                requestBody = originalRequestBody;
            }
        }

        let options: any = {
            url: encodeUrl(httpRequest.url),
            headers: httpRequest.headers,
            method: httpRequest.method,
            body: requestBody,
            encoding: null,
            time: true,
            timeout: this._settings.timeoutInMilliseconds,
            followRedirect: this._settings.followRedirect,
            jar: this._settings.rememberCookiesForSubsequentRequests ? request.jar(new cookieStore(PersistUtility.cookieFilePath)) : false,
            strictSSL: false,
            forever: true
        };

        // set auth to digest if Authorization header follows: Authorization: Digest username password
        let authorization = getHeader(options.headers, 'Authorization');
        if (authorization) {
            let start = authorization.indexOf(' ');
            let scheme = authorization.substr(0, start);
            if (scheme === 'Digest' || scheme === 'Basic') {
                let params = authorization.substr(start).trim().split(' ');
                let [user, pass] = params;
                if (user && pass) {
                    options.auth = {
                        user,
                        pass,
                        sendImmediately: scheme === 'Basic'
                    };
                }
            }
        }

        // set certificate
        let certificate = this.getRequestCertificate(httpRequest.url);
        if (certificate) {
            options.cert = certificate.cert;
            options.key = certificate.key;
            options.pfx = certificate.pfx;
            options.passphrase = certificate.passphrase;
        }

        // set proxy
        if (this._settings.proxy && !HttpClient.ignoreProxy(httpRequest.url, this._settings.excludeHostsForProxy)) {
            const proxyEndpoint = url.parse(this._settings.proxy);
            if (/^https?:$/.test(proxyEndpoint.protocol)) {
                const proxyOptions = {
                    host: proxyEndpoint.hostname,
                    port: +proxyEndpoint.port,
                    rejectUnauthorized: this._settings.proxyStrictSSL
                };

                const ctor = (httpRequest.url.startsWith('http:')
                    ? await import('http-proxy-agent')
                    : await import('https-proxy-agent')).default;

                options.agent = new ctor(proxyOptions);
            }
        }

        if (this._settings.proxy && !options.agent) {
            options.proxy = null;
        }

        if (!options.headers) {
            options.headers = httpRequest.headers = {};
        }

        // add default headers if not specified
        for (let header in this._settings.defaultHeaders) {
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

    private decodeEscapedUnicodeCharacters(body: string): string {
        return body.replace(/\\u([\d\w]{4})/gi, (_, g) => String.fromCharCode(parseInt(g, 16)));
    }

    private getRequestCertificate(requestUrl: string): { cert?: string, key?: string, pfx?: string, passphrase?: string } {
        const host = url.parse(requestUrl).host;
        if (host in this._settings.hostCertificates) {
            let certificate = this._settings.hostCertificates[host];
            let cert = undefined,
                key = undefined,
                pfx = undefined;
            if (certificate.cert) {
                let certPath = HttpClient.resolveCertificateFullPath(certificate.cert, "cert");
                if (certPath) {
                    cert = fs.readFileSync(certPath);
                }
            }
            if (certificate.key) {
                let keyPath = HttpClient.resolveCertificateFullPath(certificate.key, "key");
                if (keyPath) {
                    key = fs.readFileSync(keyPath);
                }
            }
            if (certificate.pfx) {
                let pfxPath = HttpClient.resolveCertificateFullPath(certificate.pfx, "pfx");
                if (pfxPath) {
                    pfx = fs.readFileSync(pfxPath);
                }
            }
            return new HostCertificate(cert, key, pfx, certificate.passphrase);
        }
    }

    private static getResponseRawHeaderNames(rawHeaders: string[]): Headers {
        let result: Headers = {};
        rawHeaders.forEach(header => {
            result[header.toLowerCase()] = header;
        });
        return result;
    }

    private static ignoreProxy(requestUrl: string, excludeHostsForProxy: string[]): Boolean {
        if (!excludeHostsForProxy || excludeHostsForProxy.length === 0) {
            return false;
        }

        let resolvedUrl = url.parse(requestUrl);
        let hostName = resolvedUrl.hostname && resolvedUrl.hostname.toLowerCase();
        let port = resolvedUrl.port;
        let excludeHostsProxyList = Array.from(new Set(excludeHostsForProxy.map(eh => eh.toLowerCase())));

        for (let index = 0; index < excludeHostsProxyList.length; index++) {
            let eh = excludeHostsProxyList[index];
            let urlParts = eh.split(":");
            if (!port) {
                // if no port specified in request url, host name must exactly match
                if (urlParts.length === 1 && urlParts[0] === hostName) {
                    return true;
                }
            } else {
                // if port specified, match host without port or hostname:port exactly match
                let [ph, pp] = urlParts;
                if (ph === hostName && (!pp || pp === port)) {
                    return true;
                }
            }
        }

        return false;
    }

    private static resolveCertificateFullPath(absoluteOrRelativePath: string, certName: string): string {
        if (path.isAbsolute(absoluteOrRelativePath)) {
            if (!fs.existsSync(absoluteOrRelativePath)) {
                window.showWarningMessage(`Certificate path ${absoluteOrRelativePath} of ${certName} doesn't exist, please make sure it exists.`);
                return;
            } else {
                return absoluteOrRelativePath;
            }
        }

        // the path should be relative path
        let rootPath = getWorkspaceRootPath();
        let absolutePath = '';
        if (rootPath) {
            absolutePath = path.join(Uri.parse(rootPath).fsPath, absoluteOrRelativePath);
            if (fs.existsSync(absolutePath)) {
                return absolutePath;
            } else {
                window.showWarningMessage(`Certificate path ${absoluteOrRelativePath} of ${certName} doesn't exist, please make sure it exists.`);
                return;
            }
        }

        absolutePath = path.join(path.dirname(window.activeTextEditor.document.fileName), absoluteOrRelativePath);
        if (fs.existsSync(absolutePath)) {
            return absolutePath;
        } else {
            window.showWarningMessage(`Certificate path ${absoluteOrRelativePath} of ${certName} doesn't exist, please make sure it exists.`);
            return;
        }
    }

    private static capitalizeHeaderName(headers: Headers): Headers {
        let normalizedHeaders = {};
        if (headers) {
            for (let header in headers) {
                let capitalizedName = header.replace(/([^-]+)/g, h => h.charAt(0).toUpperCase() + h.slice(1));
                normalizedHeaders[capitalizedName] = headers[header];
            }
        }

        return normalizedHeaders;
    }
}
