import { HttpRequest } from './httpRequest';

export interface RequestParser {
    parseHttpRequest(requestAbsoluteFilePath: string, name?: string): HttpRequest;
}