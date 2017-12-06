'use strict';

export class RequestParserUtil {
    public static parseRequestHeaders(headerLines: string[]): { [key: string]: string } {
        // message-header = field-name ":" [ field-value ]
        let headers: { [key: string]: string } = {};
        let headerNames: { [key: string]: string } = {};
        headerLines.forEach(headerLine => {
            let fieldName: string;
            let fieldValue: string;
            let separatorIndex = headerLine.indexOf(':');
            if (separatorIndex === -1) {
                fieldName = headerLine;
                fieldValue = '';
            } else {
                fieldName = headerLine.substring(0, separatorIndex);
                fieldValue = headerLine.substring(separatorIndex + 1);
            }

            let normalizedFieldName = fieldName.trim().toLowerCase();
            let normalizedFieldValue = fieldValue.trim();
            if (!headerNames[normalizedFieldName]) {
                headerNames[normalizedFieldName] = fieldName.trim();
                headers[fieldName.trim()] = normalizedFieldValue;
            } else {
                let splitter = normalizedFieldName === 'cookie' ? ';' : ',';
                headers[headerNames[normalizedFieldName]] += `${splitter}${normalizedFieldValue}`;
            }
        });

        return headers;
    }
}