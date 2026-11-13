import dayjs, { Dayjs, ManipulateType } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import * as dotenv from 'dotenv';
import * as fs from 'fs-extra';
import * as path from 'path';
import { Clipboard, env, TextDocument } from 'vscode';
import * as Constants from '../../common/constants';
import { EnvironmentController } from '../../controllers/environmentController';
import { ResolveErrorMessage, ResolveWarningMessage } from '../../models/httpVariableResolveResult';
import { VariableType } from '../../models/variableType';
import { fakerRegex, loadFaker, resolveFakerPath } from '../fakerShared';
import { AadV2TokenProvider } from '../aadV2TokenProvider';
import { CALLBACK_PORT, OidcClient } from '../auth/oidcClient';
import { EnvironmentVariableProvider } from './environmentVariableProvider';
import { HttpVariable, HttpVariableContext } from '../../models/httpVariable';
import { HttpVariableProvider } from './httpVariableProvider';
import { SecretStore } from '../secrets';

import { v4 as uuidv4 } from 'uuid';

dayjs.extend(utc);

type SystemVariableValue = Pick<HttpVariable, Exclude<keyof HttpVariable, 'name'>>;
type ResolveSystemVariableFunc = (name: string, document: TextDocument, context: HttpVariableContext) => Promise<SystemVariableValue>;

export class SystemVariableProvider implements HttpVariableProvider {

    private readonly clipboard: Clipboard;
    private readonly resolveFuncs: Map<string, ResolveSystemVariableFunc> = new Map<string, ResolveSystemVariableFunc>();
    private readonly timestampRegex: RegExp = new RegExp(`\\${Constants.TimeStampVariableName}(?:\\s(\\-?\\d+)\\s(y|Q|M|w|d|h|m|s|ms))?`);
    private readonly datetimeRegex: RegExp = new RegExp(`\\${Constants.DateTimeVariableName}\\s(rfc1123|iso8601|\'.+\'|\".+\")(?:\\s(\\-?\\d+)\\s(y|Q|M|w|d|h|m|s|ms))?`);
    private readonly localDatetimeRegex: RegExp = new RegExp(`\\${Constants.LocalDateTimeVariableName}\\s(rfc1123|iso8601|\'.+\'|\".+\")(?:\\s(\\-?\\d+)\\s(y|Q|M|w|d|h|m|s|ms))?`);
    private readonly randomIntegerRegex: RegExp = new RegExp(`\\${Constants.RandomIntVariableName}\\s(\\-?\\d+)\\s(\\-?\\d+)`);
    private readonly processEnvRegex: RegExp = new RegExp(`\\${Constants.ProcessEnvVariableName}\\s(\\%)?(\\w+)`);

    private readonly dotenvRegex: RegExp = new RegExp(`\\${Constants.DotenvVariableName}\\s(\\%)?([\\w-.]+)`);
    private readonly secretRegex: RegExp = new RegExp(`\\${Constants.SecretVariableName}\\s+([\\w.-]+)`);
    private readonly randomIntegerJetBrainsRegex: RegExp = /\$random\.integer\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)/;

    private readonly oidcRegex: RegExp = new RegExp(`\\s*(\\${Constants.OidcVariableName})(?:\\s+(${Constants.OIdcForceNewOption}))?(?:\\s*clientId:([\\w|.|:|/|_|-]+))?(?:\\s*issuer:([\\w|.|:|/]+))?(?:\\s*callbackDomain:([\\w|.|:|/|_|-]+))?(?:\\s*callbackPort:([\\w|_]+))?(?:\\s*authorizeEndpoint:([\\w|.|:|/|_|-]+))?(?:\\s*tokenEndpoint:([\\w|.|:|/|_|-]+))?(?:\\s*scopes:([\\w|.|:|/|_|-]+))?(?:\\s*audience:([\\w|.|:|/|_|-]+))?`);

    private readonly innerSettingsEnvironmentVariableProvider: EnvironmentVariableProvider =  EnvironmentVariableProvider.Instance;
    private static _instance: SystemVariableProvider;

    public static get Instance(): SystemVariableProvider {
        if (!this._instance) {
            this._instance = new SystemVariableProvider();
        }

        return this._instance;
    }

    private constructor() {
        this.clipboard = env.clipboard;
        this.registerTimestampVariable();
        this.registerDateTimeVariable();
        this.registerLocalDateTimeVariable();
        this.registerGuidVariable();
        this.registerRandomIntVariable();
        this.registerProcessEnvVariable();
        this.registerDotenvVariable();
        this.registerSecretVariable();
        this.registerFakerVariable();
        this.registerJetBrainsAliases();
        this.registerOidcTokenVariable();
        this.registerAadV2TokenVariable();
    }

    public readonly type: VariableType = VariableType.System;

    public async has(name: string, document: TextDocument): Promise<boolean> {
        return this.resolveFuncs.has(SystemVariableProvider.nameOf(name));
    }

    /** `$random.integer(1,9)` has no space: the name is whatever comes before the parenthesis. */
    private static nameOf(name: string): string {
        return name.split(' ').filter(Boolean)[0].replace(/\(.*$/, '');
    }

    public async get(name: string, document: TextDocument, context: HttpVariableContext): Promise<HttpVariable> {
        const variableName = SystemVariableProvider.nameOf(name);
        if (!this.resolveFuncs.has(variableName)) {
            return { name: variableName, error: ResolveErrorMessage.SystemVariableNotExist };
        }

        const result = await this.resolveFuncs.get(variableName)!(name, document, context);
        return { name: variableName, ...result };
    }

    public async getAll(_document: undefined, _context: HttpVariableContext): Promise<HttpVariable[]> {
        return [...this.resolveFuncs.keys()].map(name => ({ name }));
    }

    private registerTimestampVariable() {
        this.resolveFuncs.set(Constants.TimeStampVariableName, async name => {
            const groups = this.timestampRegex.exec(name);
            if (groups !== null && groups.length === 3) {
                const [, offset, option] = groups;
                const ts = offset && option
                    ? dayjs.utc().add(+offset, option as ManipulateType).unix()
                    : dayjs.utc().unix();
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
                let date: Dayjs;
                if (offset && option) {
                    date = dayjs.utc().add(+offset, option as ManipulateType);
                } else {
                    date = dayjs.utc();
                }

                if (type === 'rfc1123') {
                    return { value: date.toDate().toUTCString() };
                } else if (type === 'iso8601') {
                    return { value: date.toISOString() };
                } else {
                    return { value: date.format(type.slice(1, type.length - 1)) };
                }
            }

            return { warning: ResolveWarningMessage.IncorrectDateTimeVariableFormat };
        });
    }

    private registerLocalDateTimeVariable() {
        this.resolveFuncs.set(Constants.LocalDateTimeVariableName, async name => {
            const groups = this.localDatetimeRegex.exec(name);
            if (groups !== null && groups.length === 4) {
                const [, type, offset, option] = groups;
                let date = dayjs.utc().local();
                if (offset && option) {
                    date = date.add(+offset, option as ManipulateType);
                }

                if (type === 'rfc1123') {
                    return { value: date.locale('en').format('ddd, DD MMM YYYY HH:mm:ss ZZ') };
                } else if (type === 'iso8601') {
                    return { value: date.format() };
                } else {
                    return { value: date.format(type.slice(1, type.length - 1)) };
                }
            }

            return { warning: ResolveWarningMessage.IncorrectLocalDateTimeVariableFormat };
        });
    }

    private registerGuidVariable() {
        this.resolveFuncs.set(Constants.GuidVariableName, async () => ({ value: uuidv4() }));
    }

    private registerRandomIntVariable() {
        this.resolveFuncs.set(Constants.RandomIntVariableName, async name => {
            const groups = this.randomIntegerRegex.exec(name);
            if (groups !== null && groups.length === 3) {
                const [, min, max] = groups;
                const minNum = Number(min);
                const maxNum = Number(max);
                if (minNum < maxNum) {
                    return { value: (Math.floor(Math.random() * (maxNum - minNum)) + minNum).toString() };
                }
            }

            return { warning: ResolveWarningMessage.IncorrectRandomIntegerVariableFormat };
        });
    }
    private registerProcessEnvVariable() {
        this.resolveFuncs.set(Constants.ProcessEnvVariableName, async name => {
            const groups = this.processEnvRegex.exec(name);
            if (groups !== null && groups.length === 3) {
                const [, refToggle, environmentVarName] = groups;
                let processEnvName = environmentVarName;
                if (refToggle !== undefined) {
                    processEnvName = await this.resolveSettingsEnvironmentVariable(environmentVarName);
                }
                const envValue = process.env[processEnvName];
                if (envValue !== undefined) {
                    return { value: envValue.toString() };
                } else {
                    return { value: '' };
                }
            }
            return { warning: ResolveWarningMessage.IncorrectProcessEnvVariableFormat };
        });
    }

    private registerDotenvVariable() {
        this.resolveFuncs.set(Constants.DotenvVariableName, async (name, document) => {
            let folderPath = path.dirname(document.fileName);
            const { name: environmentName } = await EnvironmentController.getCurrentEnvironment();

            let pathsFound = [false, false];

            while ((pathsFound = await Promise.all([
                fs.pathExists(path.join(folderPath, `.env.${environmentName}`)),
                fs.pathExists(path.join(folderPath, '.env'))
            ])).every(result => result === false)) {
                folderPath = path.join(folderPath, '..');
                if (folderPath === path.parse(process.cwd()).root) {
                    return { warning: ResolveWarningMessage.DotenvFileNotFound };
                }
            }
            const absolutePath = path.join(folderPath, pathsFound[0] ? `.env.${environmentName}` : '.env');
            const groups = this.dotenvRegex.exec(name);
            if (groups !== null && groups.length === 3) {
                const parsed = dotenv.parse(await fs.readFile(absolutePath));
                const [, refToggle, key] = groups;
                let dotEnvVarName = key;
                if (refToggle !== undefined) {
                    dotEnvVarName = await this.resolveSettingsEnvironmentVariable(key);
                }
                if (!(dotEnvVarName in parsed)) {
                    return { warning: ResolveWarningMessage.DotenvVariableNotFound };
                }

                return { value: parsed[dotEnvVarName] };
            }

            return { warning: ResolveWarningMessage.IncorrectDotenvVariableFormat };
        });
    }

    private registerFakerVariable() {
        this.resolveFuncs.set(Constants.FakerVariableName, async name => {
            const groups = fakerRegex.exec(name);
            if (groups !== null) {
                const [, path, params] = groups;
                const faker = await loadFaker();
                const result = resolveFakerPath(faker, path, params);
                return 'error' in result ? { warning: result.error as any } : result;
            }
            return { warning: ResolveWarningMessage.IncorrectFakerVariableFormat };
        });
    }

    private registerSecretVariable() {
        this.resolveFuncs.set(Constants.SecretVariableName, async name => {
            const groups = this.secretRegex.exec(name);
            if (groups === null) {
                return { warning: 'Secret variable should follow format "{{$secret NAME}}"' };
            }
            const [, secretName] = groups;
            if (!SecretStore.ready) {
                return { warning: 'Secret storage is not available' };
            }
            // Asked for the first time it is used, then stored; after that it is invisible.
            const value = (await SecretStore.get(secretName)) ?? (await SecretStore.prompt(secretName));
            if (value === undefined) {
                return { warning: `Secret "${secretName}" is not set. Run "RestClient: Set secret"` };
            }
            return { value: value };
        });
    }

    /** JetBrains names for what already existed: one of their files works untouched. */
    private registerJetBrainsAliases() {
        this.resolveFuncs.set(Constants.UuidVariableName, async () => ({ value: uuidv4() }));
        this.resolveFuncs.set(Constants.IsoTimestampVariableName, async () => ({ value: dayjs.utc().toISOString() }));
        this.resolveFuncs.set(Constants.RandomIntegerJetBrainsVariableName, async name => {
            const groups = this.randomIntegerJetBrainsRegex.exec(name);
            if (groups === null) {
                return { warning: 'Random integer should follow format "{{$random.integer(min,max)}}"' };
            }
            const min = Number(groups[1]);
            const max = Number(groups[2]);
            if (min >= max) {
                return { warning: 'Random integer: min must be lower than max' };
            }
            return { value: String(min + Math.floor(Math.random() * (max - min))) };
        });
    }


    private registerOidcTokenVariable() {
        this.resolveFuncs.set(Constants.OidcVariableName, async (name, _document, _context) => {
            const matchVar = this.oidcRegex.exec(name) ?? [];
            const [_, _1, forceNew, clientId, _3, callbackDomain, callbackPort, authorizeEndpoint, tokenEndpoint,  scopes, audience] = matchVar;

            const access_token = await OidcClient.getAccessToken(forceNew ? true : false, clientId, callbackDomain, parseInt(callbackPort ?? CALLBACK_PORT), authorizeEndpoint, tokenEndpoint, scopes, audience);
            await this.clipboard.writeText(access_token ?? "");
            return { value: access_token ?? "" };
        });
    }

    private registerAadV2TokenVariable() {
        this.resolveFuncs.set(Constants.AzureActiveDirectoryV2TokenVariableName,
            async (name) => {
                const aadV2TokenProvider = new AadV2TokenProvider();
                const token = await aadV2TokenProvider.acquireToken(name);
                return { value: token };
            });
    }
    private async resolveSettingsEnvironmentVariable(name: string) {
        if (await this.innerSettingsEnvironmentVariableProvider.has(name)) {
            const { value, error, warning } = await this.innerSettingsEnvironmentVariableProvider.get(name);
            if (!error && !warning) {
                return value!.toString();
            } else {
                return name;
            }
        } else {
            return name;
        }
    }

}
