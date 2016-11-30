"use strict";

import { RestClientSettings } from './models/configurationSettings'
import { HttpRequest } from './models/httpRequest'
import { HttpResponse } from './models/httpResponse'
import { PersistUtility } from './persistUtility'
import { MimeUtility } from './mimeUtility'
import * as url from 'url'

var encodeUrl = require('encodeurl');
var request = require('request');
var cookieStore = require('tough-cookie-file-store');
var iconv = require('iconv-lite');

export class HttpClient {
    private _settings: RestClientSettings;

    constructor(settings: RestClientSettings) {
        this._settings = settings;
        PersistUtility.createCookieFileIfNotExist();
    }

    async send(httpRequest: HttpRequest): Promise<HttpResponse> {
        let options: any = {
            url: encodeUrl(httpRequest.url),
            headers: httpRequest.headers,
            method: httpRequest.method,
            body: httpRequest.body,
            encoding: null,
            time: true,
            timeout: this._settings.timeoutInMilliseconds,
            gzip: true,
            followRedirect: this._settings.followRedirect,
            jar: this._settings.rememberCookiesForSubsequentRequests ? request.jar(new cookieStore(PersistUtility.cookieFilePath)) : false
        };

        // set proxy
        options.proxy = HttpClient.ignoreProxy(httpRequest.url, this._settings.excludeHostsForProxy) ? null : this._settings.proxy;
        options.strictSSL = options.proxy && options.proxy.length > 0 ? this._settings.proxyStrictSSL : false;

        if (!options.headers) {
            options.headers = httpRequest.headers = {};
        }

        // add default user agent if not specified
        if (!HttpClient.getHeaderValue(options.headers, 'User-Agent')) {
            options.headers['User-Agent'] = this._settings.defaultUserAgent;
        }

        let size = 0;

        return new Promise<HttpResponse>((resolve, reject) => {
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

                let contentType = HttpClient.getHeaderValue(response.headers, 'Content-Type');
                let encoding: string;
                if (contentType) {
                    encoding = MimeUtility.parse(contentType).charset;
                }

                if (!encoding) {
                    encoding = "utf8";
                }

                let buffer = new Buffer(body);
                try {
                    body = iconv.decode(buffer, encoding);
                } catch (e) {
                    if (encoding !== 'utf8') {
                        body = iconv.decode(buffer, 'utf8');
                    }
                }

                // adjust response header case, due to the response headers in request package is in lowercase
                var headersDic = HttpClient.getResponseRawHeaderNames(response.rawHeaders);
                let adjustedResponseHeaders: { [key: string]: string } = {};
                for (var header in response.headers) {
                    let adjustedHeaderName = header;
                    if (headersDic[header]) {
                        adjustedHeaderName = headersDic[header];
                        adjustedResponseHeaders[headersDic[header]] = response.headers[header];
                    }
                    adjustedResponseHeaders[adjustedHeaderName] = response.headers[header];
                }

                resolve(new HttpResponse(
                            response.statusCode,
                            response.statusMessage,
                            response.httpVersion,
                            adjustedResponseHeaders,
                            body,
                            response.elapsedTime,
                            httpRequest.url,
                            size));
            })
            .on('data', function(data) {
                size += data.length;
            })
        });
    }

    static getHeaderValue(headers: { [key: string]: string }, headerName: string): string {
        if (headers) {
            for (var key in headers) {
                if (key.toLowerCase() === headerName.toLowerCase()) {
                    return headers[key];
                }
            }
        }

        return null;
    }

    private static getResponseRawHeaderNames(rawHeaders: string[]): { [key: string]: string } {
        let result: { [key: string]: string } = {};
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
        let hostName = resolvedUrl.hostname.toLowerCase();
        let port = resolvedUrl.port;
        let excludeHostsProxyList = Array.from(new Set(excludeHostsForProxy.map(eh => eh.toLowerCase())));

        for (var index = 0; index < excludeHostsProxyList.length; index++) {
            var eh = excludeHostsProxyList[index];
            let urlParts = eh.split(":");
            if (!port) {
                // if no port specified in request url, host name must exactly match
                if (urlParts.length === 1 && urlParts[0] === hostName) {
                    return true
                };
            } else {
                // if port specified, match host without port or hostname:port exactly match
                if (urlParts.length === 1 && urlParts[0] === hostName) {
                    return true;
                } else if (urlParts.length === 2 && urlParts[0] === hostName && urlParts[1] === port) {
                    return true;
                }
            }
        }

        return false;
    }
}
