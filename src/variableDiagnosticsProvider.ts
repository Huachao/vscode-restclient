'use strict';

import { workspace, languages, Diagnostic, DiagnosticSeverity, DiagnosticCollection, TextDocument, Range, Position } from 'vscode';

import { OnRequestVariableEvent } from "./events/requestVariableEvent";
import { VariableProcessor } from "./variableProcessor";

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

        let diagnostics: Diagnostic[] = [];

        let vars = this.findVariables(document);

        const varNames = [...new Set(vars.keys())];

        let existArray = await VariableProcessor.checkVariableDefinitionExists(document, varNames);

        existArray.forEach(({ name, exists }) => {
            if (!exists) {
                vars.get(name).forEach((v) => {
                    diagnostics.push({
                        severity: DiagnosticSeverity.Error,
                        range: new Range(new Position(v.lineNumber, v.startIndex), new Position(v.lineNumber, v.endIndex)),
                        message: `${v.variableName} is not loaded in memory`,
                        source: 'http',
                        code: 0,
                    });
                });
            }
        });

        this.httpDiagnosticCollection.set(document.uri, diagnostics);
    }

    private findVariables(document: TextDocument): Map<string, Variable[]> {
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