import { HttpRequest } from './httpRequest';

export interface RequestParser {
    parseHttpRequest(name?: string): Promise<HttpRequest>;
}