'use strict';

import { Diagnostic, DiagnosticCollection, DiagnosticSeverity, languages, Position, Range, TextDocument, workspace } from 'vscode';
import { RequestVariableCacheKey } from '../models/requestVariableCacheKey';
import { ResolveState } from '../models/requestVariableResolveResult';
import { VariableType } from '../models/variableType';
import { RequestVariableCache } from "../utils/requestVariableCache";
import { RequestVariableCacheValueProcessor } from "../utils/requestVariableCacheValueProcessor";
import { VariableProcessor } from "../utils/variableProcessor";

export class VariableDiagnosticsProvider {
    private httpDiagnosticCollection: DiagnosticCollection;

    constructor() {
        this.httpDiagnosticCollection = languages.createDiagnosticCollection();

        this.checkVariablesInAllTextDocuments();

        RequestVariableCache.onDidCreateNewRequestVariable(() => this.checkVariablesInAllTextDocuments());

        workspace.onDidChangeConfiguration(e => e.affectsConfiguration('rest-client') && this.checkVariablesInAllTextDocuments());
    }

    public dispose(): void {
        this.httpDiagnosticCollection.clear();
        this.httpDiagnosticCollection.dispose();
    }

    public deleteDocumentFromDiagnosticCollection(textDocument: TextDocument) {
        if (this.httpDiagnosticCollection.has(textDocument.uri)) {
            this.httpDiagnosticCollection.delete(textDocument.uri);
        }
    }

    public checkVariablesInAllTextDocuments() {
        workspace.textDocuments.forEach(this.checkVariables, this);
    }

    public async checkVariables(document: TextDocument) {
        if (document.languageId !== 'http' || document.uri.scheme !== 'file') {
            return;
        }

        const diagnostics: Diagnostic[] = [];

        const allAvailableVariables = await VariableProcessor.getAllVariablesDefinitions(document);
        const variableReferences = this.findVariableReferences(document);

        // Variable not found
        [...variableReferences.entries()]
            .filter(([name]) => !allAvailableVariables.has(name))
            .forEach(([, variables]) => {
                variables.forEach(v => {
                    diagnostics.push(
                        new Diagnostic(
                            new Range(new Position(v.lineNumber, v.startIndex), new Position(v.lineNumber, v.endIndex)),
                            `${v.variableName} is not found`,
                            DiagnosticSeverity.Error));
                });
            });

        // Request variable not active
        [...variableReferences.entries()]
            .filter(([name]) =>
                allAvailableVariables.has(name)
                && allAvailableVariables.get(name)[0] === VariableType.Request
                && !RequestVariableCache.has(new RequestVariableCacheKey(name, document.uri.toString())))
            .forEach(([, variables]) => {
                variables.forEach(v => {
                    diagnostics.push(
                        new Diagnostic(
                            new Range(new Position(v.lineNumber, v.startIndex), new Position(v.lineNumber, v.endIndex)),
                            `Request '${v.variableName}' has not been sent`,
                            DiagnosticSeverity.Information));
                });
            });

        // Request variable resolve with warning or error
        [...variableReferences.entries()]
            .filter(([name]) =>
                allAvailableVariables.has(name)
                && allAvailableVariables.get(name)[0] === VariableType.Request
                && RequestVariableCache.has(new RequestVariableCacheKey(name, document.uri.toString())))
            .forEach(([name, variables]) => {
                const value = RequestVariableCache.get(new RequestVariableCacheKey(name, document.uri.toString()));
                variables.forEach(v => {
                    const path = v.variableValue.replace(/^\{{2}\s*/, '').replace(/\s*\}{2}$/, '');
                    const result = RequestVariableCacheValueProcessor.resolveRequestVariable(value, path);
                    if (result.state !== ResolveState.Success) {
                        diagnostics.push(
                            new Diagnostic(
                                new Range(new Position(v.lineNumber, v.startIndex), new Position(v.lineNumber, v.endIndex)),
                                result.message,
                                result.state === ResolveState.Error ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning));
                    }
                });
            });

        this.httpDiagnosticCollection.set(document.uri, diagnostics);
    }

    private findVariableReferences(document: TextDocument): Map<string, Variable[]> {
        let vars: Map<string, Variable[]> = new Map<string, Variable[]>();
        let lines = document.getText().split(/\r?\n/g);
        let pattern = /\{\{(\w+)(\..*?)*\}\}/g;
        lines.forEach((line, lineNumber) => {
            let match: RegExpExecArray;
            while (match = pattern.exec(line)) {
                const [variablePath, variableName] = match;
                const variable = new Variable(
                    variableName,
                    variablePath,
                    match.index,
                    match.index + variablePath.length,
                    lineNumber
                );
                if (vars.has(variableName)) {
                    vars.get(variableName).push(variable);
                } else {
                    vars.set(variableName, [variable]);
                }
            }
        });

        return vars;
    }
}

class Variable {
    constructor(
        public variableName: string,
        public variableValue: string,
        public startIndex: number,
        public endIndex: number,
        public lineNumber: number) {

    }
}