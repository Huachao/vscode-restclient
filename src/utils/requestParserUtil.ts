'use strict';

import { Headers } from "../models/base";

export class RequestParserUtil {
    public static parseRequestHeaders(headerLines: string[]): Headers {
        // message-header = field-name ":" [ field-value ]
        let headers: Headers = {};
        let headerNames: Headers = {};
        headerLines.forEach(headerLine => {
            let fieldName: string;
            let fieldValue: string;
            let separatorIndex = headerLine.indexOf(':');
            if (separatorIndex === -1) {
                fieldName = headerLine.trim();
                fieldValue = '';
            } else {
                fieldName = headerLine.substring(0, separatorIndex).trim();
                fieldValue = headerLine.substring(separatorIndex + 1).trim();
            }

            let normalizedFieldName = fieldName.toLowerCase();
            if (!headerNames[normalizedFieldName]) {
                headerNames[normalizedFieldName] = fieldName;
                headers[fieldName] = fieldValue;
            } else {
                let splitter = normalizedFieldName === 'cookie' ? ';' : ',';
                headers[headerNames[normalizedFieldName]] += `${splitter}${fieldValue}`;
            }
        });

        return headers;
    }
}