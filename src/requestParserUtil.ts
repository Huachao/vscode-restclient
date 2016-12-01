'use strict';

export class RequestParserUtil {
    public static parseRequestHeaders(headerLines: string[]): { [key: string]: string } {
        // message-header = field-name ":" [ field-value ]
        let headers: { [key: string]: string } = {};
        let headerNames: { [key: string]: string } = {};
        headerLines.forEach(headerLine => {
            let headerParts = headerLine.split(':', 2).filter(Boolean);
            let fieldName: string;
            let fieldValue: string;
            if (headerParts.length === 2) {
                fieldName = headerParts[0];
                fieldValue = headerParts[1];
            } else if (headerParts.length === 1) {
                fieldName = headerParts[0];
                fieldValue = '';
            }

            let normalizedFieldName = fieldName.trim().toLowerCase();
            let normalizedFieldValue = fieldValue.trim();
            if (!headerNames[normalizedFieldName]) {
                headerNames[normalizedFieldName] = fieldName;
                headers[fieldName] = normalizedFieldValue;
            } else {
                let splitter = normalizedFieldName === 'cookie' ? ';' : ',';
                headers[headerNames[normalizedFieldName]] += `${splitter}${normalizedFieldValue}`;
            }
        });

        return headers;
    }
}