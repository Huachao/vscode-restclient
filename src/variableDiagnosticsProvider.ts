'use strict';

import { workspace, languages, Diagnostic, DiagnosticSeverity, DiagnosticCollection, TextDocument, Range, Position, Disposable } from 'vscode';

import { event } from "./events/requestVariableEvent";
import { VariableProcessor } from "./variableProcessor";

export class VariableDiagnosticsProvider {

    private diagnosticCollection: DiagnosticCollection;

    public activate(subscriptions: Disposable[]) {
        this.diagnosticCollection = languages.createDiagnosticCollection();

        workspace.onDidOpenTextDocument(this.checkVariables, this, subscriptions);
        workspace.onDidCloseTextDocument((textDocument) => {
            this.diagnosticCollection.delete(textDocument.uri);
        }, null, subscriptions);
        workspace.onDidSaveTextDocument(this.checkVariables, this, subscriptions);

        // Check all open documents
        this.checkVariablesInAllTextDocuments();

        event(() => {
            this.checkVariablesInAllTextDocuments();
        });
    }

    public dispose(): void {
        this.diagnosticCollection.clear();
        this.diagnosticCollection.dispose();
    }

    public async checkVariablesInAllTextDocuments() {
        workspace.textDocuments.forEach(this.checkVariables, this);
    }

    private async checkVariables(document: TextDocument) {
        if (document.languageId !== 'http') {
            return;
        }

        let diagnostics: Diagnostic[] = [];

        let vars = this.findVariables(document);

        let varNames = vars.map((v) => v.variableName.split(".")[0].split("[")[0]);

        // Distinct varNames
        varNames = Array.from(new Set(varNames));

        let existArray = await VariableProcessor.checkVariableDefinitionExists(document, varNames);

        existArray.forEach((ea) => {
            if (!ea.exists) {
                vars.forEach((v) => {
                    if (v.variableName === ea.name) {
                        diagnostics.push({
                            severity: DiagnosticSeverity.Error,
                            range: new Range(new Position(v.lineNumber, v.startIndex), new Position(v.lineNumber, v.endIndex)),
                            message: `${v.variableName} is not loaded in memory`,
                            source: 'ex',
                            code: "10",
                        });
                    }
                });
            }
        });

        this.diagnosticCollection.set(document.uri, diagnostics);
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