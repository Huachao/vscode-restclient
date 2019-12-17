import { HttpRequest } from './httpRequest';

export interface IRequestParser {
    parseHttpRequest(requestAbsoluteFilePath: string): HttpRequest;
}