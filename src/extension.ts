'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { ExtensionContext, Range, TextDocument, Uri, commands, languages, window, workspace } from 'vscode';
import { CodeSnippetController } from './controllers/codeSnippetController';
import { EnvironmentController } from './controllers/environmentController';
import { HistoryController } from './controllers/historyController';
import { RequestController } from './controllers/requestController';
import { ResponseController } from './controllers/responseController';
import { CustomVariableDefinitionProvider } from './providers/customVariableDefinitionProvider';
import { CustomVariableHoverProvider } from './providers/customVariableHoverProvider';
import { CustomVariableReferenceProvider } from './providers/customVariableReferenceProvider';
import { CustomVariableReferencesCodeLensProvider } from './providers/customVariableReferencesCodeLensProvider';
import { RequestBodyDocumentLinkProvider } from './providers/documentLinkProvider';
import { HttpCodeLensProvider } from './providers/httpCodeLensProvider';
import { HttpCompletionItemProvider } from './providers/httpCompletionItemProvider';
import { HttpDocumentSymbolProvider } from './providers/httpDocumentSymbolProvider';
import { RequestVariableCompletionItemProvider } from "./providers/requestVariableCompletionItemProvider";
import { RequestVariableHoverProvider } from './providers/requestVariableHoverProvider';
import { VariableDiagnosticsProvider } from "./providers/variableDiagnosticsProvider";
import { VariableProcessor } from './variableProcessor';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: ExtensionContext) {
    let requestController = new RequestController();
    let historyController = new HistoryController();
    let responseController = new ResponseController();
    let codeSnippetController = new CodeSnippetController();
    let environmentController = new EnvironmentController(await EnvironmentController.getCurrentEnvironment());
    context.subscriptions.push(requestController);
    context.subscriptions.push(historyController);
    context.subscriptions.push(codeSnippetController);
    context.subscriptions.push(environmentController);
    context.subscriptions.push(commands.registerCommand('rest-client.request', ((document: TextDocument, range: Range) => requestController.run(range))));
    context.subscriptions.push(commands.registerCommand('rest-client.rerun-last-request', () => requestController.rerun()));
    context.subscriptions.push(commands.registerCommand('rest-client.cancel-request', () => requestController.cancel()));
    context.subscriptions.push(commands.registerCommand('rest-client.history', () => historyController.save()));
    context.subscriptions.push(commands.registerCommand('rest-client.clear-history', () => historyController.clear()));
    context.subscriptions.push(commands.registerCommand('rest-client.save-response', () => responseController.save()));
    context.subscriptions.push(commands.registerCommand('rest-client.save-response-body', () => responseController.saveBody()));
    context.subscriptions.push(commands.registerCommand('rest-client.generate-codesnippet', () => codeSnippetController.run()));
    context.subscriptions.push(commands.registerCommand('rest-client.copy-codesnippet', () => codeSnippetController.copy()));
    context.subscriptions.push(commands.registerCommand('rest-client.copy-request-as-curl', () => codeSnippetController.copyAsCurl()));
    context.subscriptions.push(commands.registerCommand('rest-client.switch-environment', () => environmentController.switchEnvironment()));
    context.subscriptions.push(commands.registerCommand('rest-client.clear-aad-token-cache', () => VariableProcessor.clearAadTokenCache()));
    context.subscriptions.push(commands.registerCommand('rest-client._openDocumentLink', args => {
        workspace.openTextDocument(Uri.parse(args.path)).then(window.showTextDocument, error => {
            window.showErrorMessage(error.message);
        });
    }));

    const documentSelector = [
        { language: 'http', scheme: 'file' },
        { language: 'http', scheme: 'untitled' },
    ];

    context.subscriptions.push(languages.registerCompletionItemProvider(documentSelector, new HttpCompletionItemProvider()));
    context.subscriptions.push(languages.registerCompletionItemProvider(documentSelector, new RequestVariableCompletionItemProvider(), '.'));
    context.subscriptions.push(languages.registerHoverProvider(documentSelector, new CustomVariableHoverProvider()));
    context.subscriptions.push(languages.registerHoverProvider(documentSelector, new RequestVariableHoverProvider()));
    context.subscriptions.push(languages.registerCodeLensProvider(documentSelector, new HttpCodeLensProvider()));
    context.subscriptions.push(languages.registerCodeLensProvider(documentSelector, new CustomVariableReferencesCodeLensProvider()));
    context.subscriptions.push(languages.registerDocumentLinkProvider(documentSelector, new RequestBodyDocumentLinkProvider()));
    context.subscriptions.push(languages.registerDefinitionProvider(documentSelector, new CustomVariableDefinitionProvider()));
    context.subscriptions.push(languages.registerReferenceProvider(documentSelector, new CustomVariableReferenceProvider()));
    context.subscriptions.push(languages.registerDocumentSymbolProvider(documentSelector, new HttpDocumentSymbolProvider()));

    const diagnosticsProviders = new VariableDiagnosticsProvider();
    workspace.onDidOpenTextDocument(diagnosticsProviders.checkVariables, diagnosticsProviders, context.subscriptions);
    workspace.onDidCloseTextDocument((textDocument) => {
        diagnosticsProviders.deleteDocumentFromDiagnosticCollection(textDocument);
    }, null, context.subscriptions);
    workspace.onDidSaveTextDocument(diagnosticsProviders.checkVariables, diagnosticsProviders, context.subscriptions);
}

// this method is called when your extension is deactivated
export function deactivate() {
}