import { HttpRequest } from "./httpRequest";
import { HttpResponse } from "./httpResponse";

"use strict";

export class RequestVariableCacheValue {
    public constructor(
        public request: HttpRequest,
        public response?: HttpResponse) {
    }
}