'use strict';

import { EnvironmentController } from './controllers/environmentController';
import * as Constants from './constants';
import { Func } from './common/delegates';
var uuid = require('node-uuid');
var moment = require('moment');

export class VariableProcessor {
    static async processRawRequest(request: string) {
        let globalVariables = VariableProcessor.getGlobalVariables();
        for (var variablePattern in globalVariables) {
            let regex = new RegExp(`\\{\\{${variablePattern}\\}\\}`, 'g');
            if (regex.test(request)) {
                request = request.replace(regex, globalVariables[variablePattern]);
            }
        }

        let customVariables = await EnvironmentController.getCustomVariables();
        for (var variableName in customVariables) {
            let regex = new RegExp(`\\{\\{${variableName}\\}\\}`, 'g');
            if (regex.test(request)) {
                request = request.replace(regex, customVariables[variableName]);
            }
        }

        return request;
    }

    private static getGlobalVariables(): { [key: string]: Func<string, string> } {
        return {
            [`\\${Constants.TimeStampVariableName}(?:\\s(\\-?\\d+)\\s(y|Q|M|w|d|h|m|s|ms))?`]: match => {
                let regex = new RegExp(`\\${Constants.TimeStampVariableName}(?:\\s(\\-?\\d+)\\s(y|Q|M|w|d|h|m|s|ms))?`);
                let groups = regex.exec(match);
                if (groups !== null && groups.length === 3) {
                    return groups[1] && groups[2]
                        ? moment.utc().add(groups[1], groups[2]).unix()
                        : moment.utc().unix();
                }
                return match;
            },
            [`\\${Constants.GuidVariableName}`]: match => uuid.v4(),
            [`\\${Constants.RandomInt}\\s(\\-?\\d+)\\s(\\-?\\d+)`]: match => {
                let regex = new RegExp(`\\${Constants.RandomInt}\\s(\\-?\\d+)\\s(\\-?\\d+)`);
                let groups = regex.exec(match);
                if (groups !== null) {
                    let min = Number(groups[1]);
                    let max = Number(groups[2]);
                    if (min < max) {
                        min = Math.ceil(min);
                        max = Math.floor(max);
                        return Math.floor(Math.random() * (max - min)) + min;
                    }
                }
                return match;
            }
        }
    }
}