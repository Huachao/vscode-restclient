import * as fs from 'fs-extra';
import * as path from 'path';
import { Uri } from 'vscode';
import { RequestHeaders } from "../models/base";
import { getCurrentTextDocument, getWorkspaceRootPath } from './workspaceUtility';

export class RequestParserUtil {
    public static parseRequestHeaders(headerLines: string[]): RequestHeaders {
        // message-header = field-name ":" [ field-value ]
        const headers: RequestHeaders = {};
        const headerNames: { [key: string]: string } = {};
        headerLines.forEach(headerLine => {
            let fieldName: string;
            let fieldValue: string;
            const separatorIndex = headerLine.indexOf(':');
            if (separatorIndex === -1) {
                fieldName = headerLine.trim();
                fieldValue = '';
            } else {
                fieldName = headerLine.substring(0, separatorIndex).trim();
                fieldValue = headerLine.substring(separatorIndex + 1).trim();
            }

            const normalizedFieldName = fieldName.toLowerCase();
            if (!headerNames[normalizedFieldName]) {
                headerNames[normalizedFieldName] = fieldName;
                headers[fieldName] = fieldValue;
            } else {
                const splitter = normalizedFieldName === 'cookie' ? ';' : ',';
                headers[headerNames[normalizedFieldName]] += `${splitter}${fieldValue}`;
            }
        });

        return headers;
    }

    public static async resolveRequestBodyPath(refPath: string): Promise<string | undefined> {
        if (path.isAbsolute(refPath)) {
            return (await fs.pathExists(refPath)) ? refPath : undefined;
        }

        const workspaceRoot = getWorkspaceRootPath();
        if (workspaceRoot) {
            const absolutePath = path.join(Uri.parse(workspaceRoot).fsPath, refPath);
            if (await fs.pathExists(absolutePath)) {
                return absolutePath;
            }
        }

        const currentFile = getCurrentTextDocument()?.fileName;
        if (currentFile) {
            const absolutePath = path.join(path.dirname(currentFile), refPath);
            if (await fs.pathExists(absolutePath)) {
                return absolutePath;
            }
        }

        return undefined;
    }
}