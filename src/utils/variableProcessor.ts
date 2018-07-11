'use strict';

import { TextDocument, window } from 'vscode';
import { VariableType } from "../models/variableType";
import { EnvironmentVariableProvider } from './httpVariableProviders/environmentVariableProvider';
import { FileVariableProvider } from './httpVariableProviders/fileVariableProvider';
import { HttpVariableProvider } from './httpVariableProviders/httpVariableProvider';
import { RequestVariableProvider } from './httpVariableProviders/requestVariableProvider';
import { SystemVariableProvider } from './httpVariableProviders/systemVariableProvider';

export class VariableProcessor {

    private static readonly providers: HttpVariableProvider[] = [
        SystemVariableProvider.Instance,
        RequestVariableProvider.Instance,
        FileVariableProvider.Instance,
        EnvironmentVariableProvider.Instance,
    ];

    public static async processRawRequest(request: string) {
        const variableRefercenceRegex = /\{{2}(.+?)\}{2}/g;
        let result = '';
        let match: RegExpExecArray;
        let lastIndex = 0;
        variable:
        while (match = variableRefercenceRegex.exec(request)) {
            result += request.substring(lastIndex, match.index);
            lastIndex = variableRefercenceRegex.lastIndex;
            const name = match[1].trim();
            const document = window.activeTextEditor.document;
            const context = { rawRequest: request, parsedRequest: result };
            for (const provider of VariableProcessor.providers) {
                if (await provider.has(document, name, context)) {
                    const { value, error, warning } = await provider.get(document, name, context);
                    if (!error && !warning) {
                        result += value;
                        continue variable;
                    } else {
                        break;
                    }
                }
            }

            result += `{{${name}}}`;
        }
        result += request.substring(lastIndex);
        return result;
    }

    public static async getAllVariablesDefinitions(document: TextDocument): Promise<Map<string, VariableType[]>> {
        const [, requestProvider, fileProvider, environmentProvider] = VariableProcessor.providers;
        const requestVariables = await (requestProvider as RequestVariableProvider).getAll(document);
        const fileVariables = await (fileProvider as FileVariableProvider).getAll(document);
        const environmentVariables = await (environmentProvider as EnvironmentVariableProvider).getAll(document);

        const variableDefinitions = new Map<string, VariableType[]>();

        // Request variables in file
        requestVariables.forEach(({ name }) => {
            if (variableDefinitions.has(name)) {
                variableDefinitions.get(name).push(VariableType.Request);
            } else {
                variableDefinitions.set(name, [VariableType.Request]);
            }
        });

        // Normal file variables
        fileVariables.forEach(({ name }) => {
            if (variableDefinitions.has(name)) {
                variableDefinitions.get(name).push(VariableType.File);
            } else {
                variableDefinitions.set(name, [VariableType.File]);
            }
        });

        // Environment variables
        environmentVariables.forEach(({ name }) => {
            if (variableDefinitions.has(name)) {
                variableDefinitions.get(name).push(VariableType.Environment);
            } else {
                variableDefinitions.set(name, [VariableType.Environment]);
            }
        });

        return variableDefinitions;
    }
}