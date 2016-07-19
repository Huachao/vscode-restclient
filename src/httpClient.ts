"use strict";

import { RestClientSettings } from './models/configurationSettings'
import { HttpRequest } from './models/httpRequest'
import { HttpResponse } from './models/httpResponse'

var request = require('request')

export class HttpClient {
    private _settings: RestClientSettings;

    constructor(settings: RestClientSettings) {
        this._settings = settings;
    }

    send(httpRequest: HttpRequest): Promise<HttpResponse> {
        let options = {
            url: httpRequest.url,
            headers: httpRequest.headers,
            method: httpRequest.method,
            body: httpRequest.body,
            time: true,
            timeout: this._settings.timeoutInMilliseconds,
            strictSSL: false,
            gzip: true,
            followRedirect: this._settings.followRedirect
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