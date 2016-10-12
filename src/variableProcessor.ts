'use strict';

import * as Constants from './constants'
import { Func } from './common/delegates';
var uuid = require('node-uuid');
var moment = require('moment');

export class VariableProcessor {
    static processRawRequest(request: string) {
        let globalVariables = VariableProcessor.getGlobalVariables();
        for (var variablePattern in globalVariables) {
            let regex = new RegExp(`\\{\\{${variablePattern}\\}\\}`, 'g');
            if (regex.test(request)) {
                request = request.replace(regex, globalVariables[variablePattern]);
            }
        }

        return request;
    }

    private static getGlobalVariables(): { [key: string]: Func<string, string> } {
        return {
            [`\\${Constants.TimeStampVariableName}(?:\\s(\\-?\\d+)\\s(y|Q|M|w|d|h|m|s|ms))?`]: match => {
                let regex = new RegExp(`\\${Constants.TimeStampVariableName}(?:\\s(\\-?\\d+)\\s(y|Q|M|w|d|h|m|s|ms))?`);
                let groups = regex.exec(match);
                if (groups !== null) {
                    if (groups.length === 3) {
                        if (groups[1] && groups[2]) {
                            return moment.utc().add(groups[1], groups[2]).unix();
                        }
                    }
                }
                return moment.utc().unix();
            },
            [`\\${Constants.GuidVariableName}`]: match => uuid.v4()
        }
    }
}