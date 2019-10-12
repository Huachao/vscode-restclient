"use strict";

import * as http from 'http';

export type ResponseHeaders = http.IncomingHttpHeaders;

export type ResponseHeaderValue = { [K in keyof ResponseHeaders]: ResponseHeaders[K] }[keyof ResponseHeaders];

export type RequestHeaders = http.OutgoingHttpHeaders;

export type RequestHeaderValue = { [K in keyof RequestHeaders]: RequestHeaders[K] }[keyof RequestHeaders];