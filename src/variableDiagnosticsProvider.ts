'use strict';

import { workspace, languages, Diagnostic, DiagnosticSeverity, DiagnosticCollection, TextDocument, Range, Position } from 'vscode';

import { OnRequestVariableEvent } from "./events/requestVariableEvent";
import { VariableProcessor } from "./variableProcessor";
import { RequestVariableCache } from "./requestVariableCache";
import { RequestVariableCacheKey } from './models/requestVariableCacheKey';
import { VariableType } from './models/variableType';

export class VariableDiagnosticsProvider {
    private httpDiagnosticCollection: DiagnosticCollection;

    constructor() {
        this.httpDiagnosticCollection = languages.createDiagnosticCollection();

        this.checkVariablesInAllTextDocuments();

        OnRequestVariableEvent(() => this.checkVariablesInAllTextDocuments());
    }

    public dispose(): void {
        this.httpDiagnosticCollection.clear();
        this.httpDiagnosticCollection.dispose();
    }

    public deleteDocumentFromDiagnosticCollection(textDocument: TextDocument) {
        this.httpDiagnosticCollection.delete(textDocument.uri);
    }

    public checkVariablesInAllTextDocuments() {
        workspace.textDocuments.forEach(this.checkVariables, this);
    }

    public async checkVariables(document: TextDocument) {
        if (document.languageId !== 'http') {
            return;
        }

        const diagnostics: Diagnostic[] = [];

        const allAvailableVariables = await VariableProcessor.getAllVariablesDefinitions(document);
        const variableReferences = this.findVariableReferences(document);

        // Variable not found
        [...variableReferences.entries()]
            .filter(([name, _]) => !allAvailableVariables.has(name))
            .forEach(([name, variables]) => {
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
            .filter(function ([name, _]) {
                let active = allAvailableVariables.has(name);
                if (active) {
                    const types = allAvailableVariables.get(name);
                    active = types[0] === VariableType.Request && !RequestVariableCache.has(new RequestVariableCacheKey(name, document.uri.toString()));
                }
                return active;
            })
            .forEach(([name, variables]) => {
                variables.forEach(v => {
                    diagnostics.push(
                        new Diagnostic(
                            new Range(new Position(v.lineNumber, v.startIndex), new Position(v.lineNumber, v.endIndex)),
                            `Request '${v.variableName}' has not been sent`,
                            DiagnosticSeverity.Error));
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
                let variablePath = match[0];
                let variableName = match[1];
                const variable = new Variable(
                    variableName,
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
        public startIndex: number,
        public endIndex: number,
        public lineNumber: number) {

    }
}