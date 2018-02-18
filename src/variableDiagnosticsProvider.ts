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

        let varNames = vars.map((v) => v.variableName);

        // Distinct varNames
        varNames = Array.from(new Set(varNames));

        let existArray = await VariableProcessor.checkVariableDefinitionExists(document, varNames);

        existArray.forEach(({ name, exists }) => {
            if (!exists) {
                vars.forEach((v) => {
                    if (v.variableName === name) {
                        diagnostics.push({
                            severity: DiagnosticSeverity.Error,
                            range: new Range(new Position(v.lineNumber, v.startIndex), new Position(v.lineNumber, v.endIndex)),
                            message: `${v.variableName} is not loaded in memory`,
                            source: 'http',
                            code: 0,
                        });
                    }
                });
            }
        });

        this.httpDiagnosticCollection.set(document.uri, diagnostics);
    }

    private findVariables(document: TextDocument): Variable[] {
        let vars: Variable[] = [];
        let lines = document.getText().split(/\r?\n/g);
        let pattern = /\{\{(\w+)(\..*?)*\}\}/;
        lines.forEach((line, i) => {
            let match: RegExpExecArray;
            let currentIndex = 0;
            while (match = pattern.exec(line)) {
                let variablePath = match[0];
                let variableName = match[1];
                let endIndex = match.index + variablePath.length;
                vars.push(new Variable(
                    variableName,
                    currentIndex + match.index,
                    currentIndex + endIndex,
                    i
                ));
                line = line.substring(endIndex);
                currentIndex += endIndex;
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