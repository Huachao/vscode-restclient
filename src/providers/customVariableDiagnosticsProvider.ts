import { ConfigurationChangeEvent, Diagnostic, DiagnosticCollection, DiagnosticSeverity, Disposable, languages, Position, Range, TextDocument, workspace } from 'vscode';
import * as Constants from '../common/constants';
import { ResolveState } from '../models/httpVariableResolveResult';
import { RequestVariableCacheKey } from '../models/requestVariableCacheKey';
import { VariableType } from '../models/variableType';
import { disposeAll } from '../utils/dispose';
import { RequestVariableCache } from "../utils/requestVariableCache";
import { RequestVariableCacheValueProcessor } from "../utils/requestVariableCacheValueProcessor";
import { VariableProcessor } from "../utils/variableProcessor";

interface VariableWithPosition {
    name: string;
    path: string;
    begin: Position;
    end: Position;
}

export class CustomVariableDiagnosticsProvider {
    private httpDiagnosticCollection: DiagnosticCollection = languages.createDiagnosticCollection();

    private disposables: Disposable[] = [this.httpDiagnosticCollection];

    private pendingHttpDocuments = new Set<TextDocument>();

    private timer: NodeJS.Timer | undefined;

    constructor() {
        this.disposables.push(
            workspace.onDidOpenTextDocument(document => this.queue(document)),
            workspace.onDidChangeTextDocument(event => this.queue(event.document)),
            workspace.onDidCloseTextDocument(document => this.clear(document)),
            workspace.onDidChangeConfiguration(event => this.queueAll(event)),
            RequestVariableCache.onDidCreateNewRequestVariable(event => this.queue(event.document))
        );
        this.queueAll();
    }

    private queue(document: TextDocument) {
        if (document.languageId === 'http' && document.uri.scheme === 'file') {
            this.pendingHttpDocuments.add(document);
            this.startTimer();
        }
    }

    private queueAll(event?: ConfigurationChangeEvent) {
        workspace.textDocuments
            .filter(document => event === undefined || event.affectsConfiguration('rest-client', document.uri))
            .forEach(document => this.queue(document));
    }

    private startTimer() {
        if (this.timer) {
            clearTimeout(this.timer);
        }
        this.timer = setTimeout(() => {
            this.checkVariables();
        }, 300);
    }

    private clear(document: TextDocument) {
        this.httpDiagnosticCollection.delete(document.uri);
        this.pendingHttpDocuments.delete(document);
    }

    public dispose() {
        disposeAll(this.disposables);
        this.disposables = [];
    }

    public async checkVariables() {
        for (const document of this.pendingHttpDocuments) {
            this.pendingHttpDocuments.delete(document);
            if (document.isClosed) {
                continue;
            }

            const diagnostics: Diagnostic[] = [];

            const allAvailableVariables = await VariableProcessor.getAllVariablesDefinitions(document);
            const variableReferences = this.findVariableReferences(document);

            // Variable not found
            [...variableReferences.entries()]
                .filter(([name]) => !allAvailableVariables.has(name))
                .forEach(([, variables]) => {
                    variables.forEach(({name, begin, end}) => {
                        diagnostics.push(
                            new Diagnostic(new Range(begin, end), `${name} is not found`, DiagnosticSeverity.Error));
                    });
                });

            // Request variable not active
            [...variableReferences.entries()]
                .filter(([name]) =>
                    allAvailableVariables.has(name)
                    && allAvailableVariables.get(name)![0] === VariableType.Request
                    && !RequestVariableCache.has(new RequestVariableCacheKey(name, document)))
                .forEach(([, variables]) => {
                    variables.forEach(({name, begin, end}) => {
                        diagnostics.push(
                            new Diagnostic(new Range(begin, end), `Request '${name}' has not been sent`, DiagnosticSeverity.Information));
                    });
                });

            // Request variable resolve with warning or error
            [...variableReferences.entries()]
                .filter(([name]) =>
                    allAvailableVariables.has(name)
                    && allAvailableVariables.get(name)![0] === VariableType.Request
                    && RequestVariableCache.has(new RequestVariableCacheKey(name, document)))
                .forEach(([name, variables]) => {
                    const value = RequestVariableCache.get(new RequestVariableCacheKey(name, document));
                    variables.forEach(({path, begin, end}) => {
                        path = path.replace(/^\{{2}\s*/, '').replace(/\s*\}{2}$/, '');
                        const result = RequestVariableCacheValueProcessor.resolveRequestVariable(value!, path);
                        if (result.state !== ResolveState.Success) {
                            diagnostics.push(
                                new Diagnostic(
                                    new Range(begin, end),
                                    result.message,
                                    result.state === ResolveState.Error ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning));
                        }
                    });
                });

            this.httpDiagnosticCollection.set(document.uri, diagnostics);
        }
    }

    private findVariableReferences(document: TextDocument): Map<string, VariableWithPosition[]> {
        const vars = new Map<string, VariableWithPosition[]>();
        const lines = document.getText().split(Constants.LineSplitterRegex);
        const pattern = /\{\{(\w+)(\..*?)*\}\}/g;
        lines.forEach((line, lineNumber) => {
            let match: RegExpExecArray | null;
            while (match = pattern.exec(line)) {
                const [path, name] = match;
                const variable = {
                    name,
                    path,
                    begin: new Position(lineNumber, match.index),
                    end: new Position(lineNumber, match.index + path.length)
                };
                if (vars.has(name)) {
                    vars.get(name)!.push(variable);
                } else {
                    vars.set(name, [variable]);
                }
            }
        });

        return vars;
    }
}
