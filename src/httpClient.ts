"use strict";

import { RestClientSettings } from './models/configurationSettings'
import { HttpRequest } from './models/httpRequest'
import { HttpResponse } from './models/httpResponse'
import { PersistUtility } from './persistUtility'

var request = require('request')
var fileCookieStore = require('tough-cookie-filestore');

export class HttpClient {
    private _settings: RestClientSettings;

    constructor(settings: RestClientSettings) {
        this._settings = settings;
        PersistUtility.createCookieFileIfNotExist();
    }

    send(httpRequest: HttpRequest): Promise<HttpResponse> {
        let options = {
            url: httpRequest.url,
            headers: httpRequest.headers,
            method: httpRequest.method,
            body: httpRequest.body,
            time: true,
            timeout: this._settings.timeoutInMilliseconds,
            proxy: this._settings.proxy,
            strictSSL: this._settings.proxy && this._settings.proxy.length > 0 ? this._settings.proxyStrictSSL : false,
            gzip: true,
            followRedirect: this._settings.followRedirect,
            jar: this._settings.rememberCookiesForSubsequentRequests ? request.jar(new fileCookieStore(PersistUtility.cookieFilePath)) : false
        };

        if (!options.headers) {
            options.headers = httpRequest.headers = {};
        }

        // add default user agent if not specified
        if (!options.headers['user-agent']) {
            options.headers['user-agent'] = this._settings.defaultUserAgent;
        }

        return new Promise<HttpResponse>((resolve, reject) => {
            request(options, function (error, response, body) {
                if (error) {
                    reject(error);
                    return;
                }

                resolve(new HttpResponse(response.statusCode, response.statusMessage, response.httpVersion, response.headers, body, response.elapsedTime));
            });
        });
    }
}
