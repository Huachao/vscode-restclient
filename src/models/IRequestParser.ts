import { HttpRequest } from './httpRequest';

export interface IRequestParser {
    parseHttpRequest(requestAbsoluteFilePath: string): HttpRequest;
}

export const confirmSendRegex = /^@confirm-send(\((.*)\))?$/;
export const defaultConfirmMsg = 'Are you sure?';