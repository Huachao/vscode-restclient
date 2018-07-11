"use strict";

import { HttpRequest } from './httpRequest';

export interface IRequestParser {
    parseHttpRequest(requestRawText: string, requestAbsoluteFilePath: string): HttpRequest;
}