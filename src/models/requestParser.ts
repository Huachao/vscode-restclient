import { HttpRequest } from './httpRequest';

export interface RequestParser {
    parseHttpRequest(requestAbsoluteFilePath: string): HttpRequest;
}