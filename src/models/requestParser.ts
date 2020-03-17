import { HttpRequest } from './httpRequest';

export interface RequestParser {
    parseHttpRequest(requestAbsoluteFilePath: string): HttpRequest;
}

export const confirmSendRegex = /^@confirm-send(\((.*)\))?$/;