'use strict';

import { Headers } from "../models/base";

export class RequestParserUtil {
    public static parseRequestHeaders(headerLines: string[]): Headers {
        // message-header = field-name ":" [ field-value ]
        const headers: Headers = {};
        const headerNames: Headers = {};
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
}