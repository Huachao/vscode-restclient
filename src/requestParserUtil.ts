'use strict';

export class RequestParserUtil {
    public static parseRequestHeaders(headerLines: string[]): { [key: string]: string } {
        // message-header = field-name ":" [ field-value ]
        let headers: { [key: string]: string } = {};
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

            let normalizedfieldName = fieldName.trim().toLowerCase();
            let normalizedfieldValue = fieldValue.trim();
            if (!headers[normalizedfieldName]) {
                headers[normalizedfieldName] = normalizedfieldValue;
            } else {
                headers[normalizedfieldName] += `,${normalizedfieldValue}`;
            }
        });

        return headers;
    }
}