'use strict';

import { workspace, languages, Diagnostic, DiagnosticSeverity, DiagnosticCollection, TextDocument, Range, Position } from 'vscode';

import { OnRequestVariableEvent } from "./events/requestVariableEvent";
import { VariableProcessor } from "./variableProcessor";

export class VariableDiagnosticsProvider {
    private httpDiagnosticCollection: DiagnosticCollection;

    constructor() {
        this.httpDiagnosticCollection = languages.createDiagnosticCollection();

        this.checkVariablesInAllTextDocuments();

        OnRequestVariableEvent(this.checkVariablesInAllTextDocuments);
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

        let varNames = vars.map((v) => v.variableName.split(".")[0].split("[")[0]);

        // Distinct varNames
        varNames = Array.from(new Set(varNames));

        let existArray = await VariableProcessor.checkVariableDefinitionExists(document, varNames);

        existArray.forEach(({name, exists}) => {
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

    private findVariables(document: TextDocument) : Variable[] {
        let vars: Variable[] = [];
        let lines = document.getText().split(/\r?\n/g);
        let pattern = /\{\{(\w+)(\.\w+|\[\d+\])*\}\}/;
        lines.forEach((line, i) => {
            let match: RegExpExecArray;
            let currentIndex = 0;
            while (match = pattern.exec(line)) {
                let variableName = match[1];
                let startIndex = match.index + 2;
                let endIndex = startIndex + variableName.length;
                vars.push(new Variable(
                    variableName,
                    currentIndex + startIndex,
                    currentIndex + endIndex,
                    i
                ));
                line = line.substring(endIndex + 2);
                currentIndex += endIndex + 2;
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