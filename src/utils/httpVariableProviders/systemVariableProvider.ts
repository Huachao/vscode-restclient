'use strict';

import { DurationInputArg2, Moment, utc } from 'moment';
import { TextDocument } from 'vscode';
import * as Constants from '../../common/constants';
import { ResolveErrorMessage, ResolveWarningMessage } from '../../models/httpVariableResolveResult';
import { VariableType } from '../../models/variableType';
import { HttpVariableContext, HttpVariableProvider, HttpVariableValue } from './httpVariableProvider';

const uuidv4 = require('uuid/v4');

type SystemVariableValue = Pick<HttpVariableValue, Exclude<keyof HttpVariableValue, 'name'>>;
type ResolveSystemVariableFunc = (name: string, context: HttpVariableContext) => Promise<SystemVariableValue>;

export class SystemVariableProvider implements HttpVariableProvider {

    private readonly resolveFuncs: Map<string, ResolveSystemVariableFunc> = new Map<string, ResolveSystemVariableFunc>();

    private readonly timestampRegex: RegExp = new RegExp(`\\${Constants.TimeStampVariableName}(?:\\s(\\-?\\d+)\\s(y|Q|M|w|d|h|m|s|ms))?`);
    private readonly datetimeRegex: RegExp = new RegExp(`\\${Constants.DateTimeVariableName}\\s(rfc1123|iso8601)(?:\\s(\\-?\\d+)\\s(y|Q|M|w|d|h|m|s|ms))?`);
    private readonly randomIntegerRegex: RegExp = new RegExp(`\\${Constants.RandomIntVariableName}\\s(\\-?\\d+)\\s(\\-?\\d+)`);

    private static _instance: SystemVariableProvider;

    public static get Instance(): SystemVariableProvider {
        if (!SystemVariableProvider._instance) {
            SystemVariableProvider._instance = new SystemVariableProvider();
        }

        return SystemVariableProvider._instance;
    }

    private constructor() {
        this.registerTimestampVariable();
        this.registerDateTimeVariable();
        this.registerGuidVariable();
        this.registerRandomIntVariable();
    }

    public readonly type: VariableType = VariableType.System;

    public async has(document: TextDocument, name: string, context: HttpVariableContext): Promise<boolean> {
        const [variableName] = name.split(' ').filter(Boolean);
        return this.resolveFuncs.has(variableName);
    }

    public async get(document: TextDocument, name: string, context: HttpVariableContext): Promise<HttpVariableValue> {
        const [variableName] = name.split(' ').filter(Boolean);
        if (!this.resolveFuncs.has(variableName)) {
            return { name: variableName, error: ResolveErrorMessage.SystemVariableNotExist };
        }

        const result = await this.resolveFuncs.get(variableName)(name, context);
        return { name: variableName, ...result };
    }

    public async getAll(document: TextDocument, context: HttpVariableContext): Promise<HttpVariableValue[]> {
        return [...this.resolveFuncs.keys()].map(name => ({ name }));
    }

    private registerTimestampVariable() {
        this.resolveFuncs.set(Constants.TimeStampVariableName, async name => {
            const groups = this.timestampRegex.exec(name);
            if (groups !== null && groups.length === 3) {
                const [, offset, option] = groups;
                const ts = offset && option
                    ? utc().add(offset, option as DurationInputArg2).unix()
                    : utc().unix();
                return { value: ts.toString() };
            }

            return { warning: ResolveWarningMessage.IncorrectTimestampVariableFormat };
        });
    }

    private registerDateTimeVariable() {
        this.resolveFuncs.set(Constants.DateTimeVariableName, async name => {
            const groups = this.datetimeRegex.exec(name);
            if (groups !== null && groups.length === 4) {
                const [, type, offset, option] = groups;
                let date: Moment;
                if (offset && option) {
                    date = utc().add(offset, option as DurationInputArg2);
                } else {
                    date = utc();
                }

                return { value: type === 'rfc1123' ? date.toString() : date.toISOString() };
            }

            return { warning: ResolveWarningMessage.IncorrectDateTimeVariableFormat };
        });
    }

    private registerGuidVariable() {
        this.resolveFuncs.set(Constants.GuidVariableName, async name => ({ value: uuidv4() }));
    }

    private registerRandomIntVariable() {
        this.resolveFuncs.set(Constants.RandomIntVariableName, async name => {
            const groups = this.randomIntegerRegex.exec(name);
            if (groups !== null && groups.length === 3) {
                const [, min, max] = groups;
                let minNum = Number(min);
                let maxNum = Number(max);
                if (minNum < maxNum) {
                    return { value: (Math.floor(Math.random() * (maxNum - minNum)) + minNum).toString() };
                }
            }

            return { warning: ResolveWarningMessage.IncorrectRandomIntegerVariableFormat };
        });
    }
}
