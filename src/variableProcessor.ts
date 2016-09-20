'use strict';

import * as Constants from './Constants'
var uuid = require('node-uuid');

export class VariableProcessor {
    static processRawRequest(request: string) {
        let globalVariables = VariableProcessor.getGlobalVariables();
        let pattern = '';
        for (var key in globalVariables) {
            if (pattern !== '') pattern += '|';
            pattern += VariableProcessor.escapeRegExp(key);
        }

        // regex replace
        return request.replace(new RegExp(pattern, 'g'), function(match) {
            return globalVariables[match] !== undefined ? globalVariables[match] : match;
        });
    }

    private static getGlobalVariables(): { [key: string]: any } {
        return {
            [Constants.TimeStampVariableName]: Date.now(),
            [Constants.GuidVariableName]: uuid.v4()
        }
    }

    private static escapeRegExp(str: string): string {
        return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
    }
}