import { TextDocument } from 'vscode';
import * as Constants from '../../common/constants';
import { DocumentCache } from '../../models/documentCache';
import { ResolveErrorMessage } from '../../models/httpVariableResolveResult';
import { VariableType } from '../../models/variableType';
import { EnvironmentVariableProvider } from './environmentVariableProvider';
import { HttpVariable, HttpVariableProvider } from './httpVariableProvider';
import { RequestVariableProvider } from './requestVariableProvider';
import { SystemVariableProvider } from './systemVariableProvider';

type FileVariableValue = Record<'name' | 'value', string>;

export class FileVariableProvider implements HttpVariableProvider {
    private static _instance: FileVariableProvider;

    public static get Instance(): FileVariableProvider {
        if (!this._instance) {
            this._instance = new FileVariableProvider();
        }

        return this._instance;
    }

    private readonly escapee: Map<string, string> = new Map<string, string>([
        ['n', '\n'],
        ['r', '\r'],
        ['t', '\t']
    ]);

    private readonly innerVariableProviders: HttpVariableProvider[] = [
        SystemVariableProvider.Instance,
        RequestVariableProvider.Instance,
        EnvironmentVariableProvider.Instance,
    ];

    private readonly fileVariableCache = new DocumentCache<FileVariableValue[]>();

    private constructor() {
    }

    public readonly type: VariableType = VariableType.File;

    public async has(name: string, document: TextDocument): Promise<boolean> {
        const variables = await this.getFileVariables(document);
        return variables.some(v => v.name === name);
    }

    public async get(name: string, document: TextDocument): Promise<HttpVariable> {
        const variables = await this.getFileVariables(document);
        const variable = variables.find(v => v.name === name);
        if (!variable) {
            return { name, error: ResolveErrorMessage.FileVariableNotExist };
        } else {
            const variableMap = await this.resolveFileVariables(document, variables);
            return { name, value: variableMap.get(name) };
        }
    }

    public async getAll(document: TextDocument): Promise<HttpVariable[]> {
        const variables = await this.getFileVariables(document);
        const variableMap = await this.resolveFileVariables(document, variables);
        return [...variableMap.entries()].map(([name, value]) => ({ name, value }));
    }

    private async getFileVariables(document: TextDocument): Promise<FileVariableValue[]> {
        if (this.fileVariableCache.has(document)) {
            return this.fileVariableCache.get(document)!;
        }

        const fileContent = document.getText();
        const variables = new Map<string, FileVariableValue>();
        for (const line of fileContent.split(Constants.LineSplitterRegex)) {
            const regex = new RegExp(Constants.FileVariableDefinitionRegex, 'g');
            let match: RegExpExecArray | null;
            while (match = regex.exec(line)) {
                const [, key, originalValue] = match;
                let value = "";
                let isPrevCharEscape = false;
                for (const currentChar of originalValue) {
                    if (isPrevCharEscape) {
                        isPrevCharEscape = false;
                        value += this.escapee.get(currentChar) || currentChar;
                    } else {
                        if (currentChar === "\\") {
                            isPrevCharEscape = true;
                            continue;
                        }
                        value += currentChar;
                    }
                }
                variables.set(key, { name: key, value });
            }
        }

        const values = [...variables.values()];
        this.fileVariableCache.set(document, values);
        return values;
    }

    private async resolveFileVariables(document: TextDocument, variables: FileVariableValue[]): Promise<Map<string, string>> {
        // Resolve non-file variables in variable value
        const fileVariableNames = new Set(variables.map(v => v.name));
        const resolvedVariables = await Promise.all(variables.map(
            async ({ name, value }) => {
                const parsedValue = await this.processNonFileVariableValue(document, value, fileVariableNames);
                return { name, value: parsedValue };
            }
        ));

        const variableMap = new Map(resolvedVariables.map(({ name, value }): [string, string] => [name, value]));
        const dependentVariables = new Map<string, string[]>();
        const dependencyCount = new Map<string, number>();
        const noDependencyVariables: string[] = [];
        for (const [name, value] of variableMap) {
            const dependentVariableNames = new Set(this.resolveDependentFileVariableNames(value).filter(v => variableMap.has(v)));
            if (dependentVariableNames.size === 0) {
                noDependencyVariables.push(name);
            } else {
                dependencyCount.set(name, dependentVariableNames.size);
                dependentVariableNames.forEach(dname => {
                    if (dependentVariables.has(dname)) {
                        dependentVariables.get(dname)!.push(name);
                    } else {
                        dependentVariables.set(dname, [name]);
                    }
                });
            }
        }

        // Resolve all dependent file variables to actual value
        while (noDependencyVariables.length !== 0) {
            const current = noDependencyVariables.shift();
            if (!dependentVariables.has(current!)) {
                continue;
            }
            const dependents = dependentVariables.get(current!);
            dependents!.forEach(d => {
                const originalValue = variableMap.get(d);
                const currentValue = originalValue!.replace(
                    new RegExp(`{{\\s*${current}\\s*}}`, 'g'),
                    variableMap.get(current!)!);
                variableMap.set(d, currentValue);
                const newCount = dependencyCount.get(d)! - 1;
                if (newCount === 0) {
                    noDependencyVariables.push(d);
                    dependencyCount.delete(d);
                } else {
                    dependencyCount.set(d, newCount);
                }
            });
        }

        return variableMap;
    }

    private async processNonFileVariableValue(document: TextDocument, value: string, variables: Set<string>): Promise<string> {
        const variableReferenceRegex = /\{{2}(.+?)\}{2}/g;
        let result = '';
        let match: RegExpExecArray | null;
        let lastIndex = 0;
        variable:
        while (match = variableReferenceRegex.exec(value)) {
            result += value.substring(lastIndex, match.index);
            lastIndex = variableReferenceRegex.lastIndex;
            const name = match[1].trim();
            if (!variables.has(name)) {
                const context = { rawRequest: value, parsedRequest: result };
                for (const provider of this.innerVariableProviders) {
                    if (await provider.has(name, document, context)) {
                        const { value, error, warning } = await provider.get(name, document, context);
                        if (!error && !warning) {
                            result += value;
                            continue variable;
                        } else {
                            break;
                        }
                    }
                }
            }

            result += `{{${name}}}`;
        }
        result += value.substring(lastIndex);
        return result;
    }

    private resolveDependentFileVariableNames(value: string): string[] {
        const variableReferenceRegex = /\{{2}(.+?)\}{2}/g;
        let match: RegExpExecArray | null;
        const result: string[] = [];
        while (match = variableReferenceRegex.exec(value)) {
            result.push(match[1].trim());
        }
        return result;
    }
}