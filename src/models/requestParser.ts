import { HttpsOptions } from './base';
import { HttpRequest } from './httpRequest';

export interface RequestParser {
    parseHttpRequest(name?: string, https?: HttpsOptions): Promise<HttpRequest>;
}