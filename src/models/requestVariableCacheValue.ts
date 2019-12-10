import { HttpRequest } from "./httpRequest";
import { HttpResponse } from "./httpResponse";

export class RequestVariableCacheValue {
    public constructor(
        public request: HttpRequest,
        public response: HttpResponse) {
    }
}