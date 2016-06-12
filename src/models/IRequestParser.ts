"use strict";

import { HttpRequest } from '../models/httpRequest'

export interface IRequestParser {
    parseHttpRequest(requestRawText: string): HttpRequest
}