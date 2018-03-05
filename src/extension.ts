'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { ExtensionContext, commands, languages, TextDocument, Range, Uri, workspace, window } from 'vscode';
import { RequestController } from './controllers/requestController';
import { HistoryController } from './controllers/historyController';
import { ResponseController } from './controllers/responseController';
import { CodeSnippetController } from './controllers/codeSnippetController';
import { EnvironmentController } from './controllers/environmentController';
import { HttpCompletionItemProvider } from './httpCompletionItemProvider';
import { CustomVariableHoverProvider } from './customVariableHoverProvider';
import { CustomVariableDefinitionProvider } from './customVariableDefinitionProvider';
import { CustomVariableReferenceProvider } from './customVariableReferenceProvider';
import { CustomVariableReferencesCodeLensProvider } from './customVariableReferencesCodeLensProvider';
import { HttpCodeLensProvider } from './httpCodeLensProvider';
import { RequestBodyDocumentLinkProvider } from './documentLinkProvider';
import { HttpDocumentSymbolProvider } from './httpDocumentSymbolProvider';
import { RequestVariableHoverProvider } from './requestVariableHoverProvider';
import { RequestVariableCompletionItemProvider } from "./requestVariableCompletionItemProvider";
import { VariableProcessor } from './variableProcessor';
import { VariableDiagnosticsProvider } from "./variableDiagnosticsProvider";

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
    context.subscriptions.push(commands.registerCommand('rest-client.save-response', uri => responseController.save(uri)));
    context.subscriptions.push(commands.registerCommand('rest-client.save-response-body', uri => responseController.saveBody(uri)));
    context.subscriptions.push(commands.registerCommand('rest-client.generate-codesnippet', () => codeSnippetController.run()));
    context.subscriptions.push(commands.registerCommand('rest-client.copy-codesnippet', () => codeSnippetController.copy()));
    context.subscriptions.push(commands.registerCommand('rest-client.copy-request-as-curl', () => codeSnippetController.copyAsCurl()));
    context.subscriptions.push(commands.registerCommand('rest-client.switch-environment', () => environmentController.switchEnvironment()));
    context.subscriptions.push(commands.registerCommand('rest-client.clear-aad-token-cache', () => VariableProcessor.clearAadTokenCache()));
    context.subscriptions.push(commands.registerCommand('rest-client._openDocumentLink', args => {
        workspace.openTextDocument(Uri.file(args.path)).then(window.showTextDocument, error => {
            window.showErrorMessage(error.message);
        });
    }));
    context.subscriptions.push(languages.registerCompletionItemProvider('http', new HttpCompletionItemProvider()));
    context.subscriptions.push(languages.registerCompletionItemProvider('http', new RequestVariableCompletionItemProvider(), '.'));
    context.subscriptions.push(languages.registerHoverProvider('http', new CustomVariableHoverProvider()));
    context.subscriptions.push(languages.registerHoverProvider('http', new RequestVariableHoverProvider()));
    context.subscriptions.push(languages.registerCodeLensProvider('http', new HttpCodeLensProvider()));
    context.subscriptions.push(languages.registerCodeLensProvider('http', new CustomVariableReferencesCodeLensProvider()));
    context.subscriptions.push(languages.registerDocumentLinkProvider('http', new RequestBodyDocumentLinkProvider()));
    context.subscriptions.push(languages.registerDefinitionProvider('http', new CustomVariableDefinitionProvider()));
    context.subscriptions.push(languages.registerReferenceProvider('http', new CustomVariableReferenceProvider()));
    context.subscriptions.push(languages.registerDocumentSymbolProvider('http', new HttpDocumentSymbolProvider()));

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