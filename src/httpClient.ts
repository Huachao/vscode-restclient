"use strict";

import { RestClientSettings } from './models/configurationSettings'
import { HttpRequest } from './models/httpRequest'
import { HttpResponse } from './models/httpResponse'
import { PersistUtility } from './persistUtility'

var encodeUrl = require('encodeurl');
var request = require('request');
var cookieStore = require('tough-cookie-file-store');

export class HttpClient {
    private _settings: RestClientSettings;

    constructor(settings: RestClientSettings) {
        this._settings = settings;
        PersistUtility.createCookieFileIfNotExist();
    }

    async send(httpRequest: HttpRequest): Promise<HttpResponse> {
        let options = {
            url: encodeUrl(httpRequest.url),
            headers: httpRequest.headers,
            method: httpRequest.method,
            body: httpRequest.body,
            time: true,
            timeout: this._settings.timeoutInMilliseconds,
            proxy: this._settings.proxy,
            strictSSL: this._settings.proxy && this._settings.proxy.length > 0 ? this._settings.proxyStrictSSL : false,
            gzip: true,
            followRedirect: this._settings.followRedirect,
            jar: this._settings.rememberCookiesForSubsequentRequests ? request.jar(new cookieStore(PersistUtility.cookieFilePath)) : false
        };

        if (!options.headers) {
            options.headers = httpRequest.headers = {};
        }

        // add default user agent if not specified
        if (!HttpClient.getHeaderValue(options.headers, 'User-Agent')) {
            options.headers['User-Agent'] = this._settings.defaultUserAgent;
        }

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
                            httpRequest.url));
            });
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
}
