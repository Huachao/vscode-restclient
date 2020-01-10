'use strict';
// Initialize RestClientSettings very early: some static configuration
// deep in some classes read the settings.
import { RestClientSettings } from './models/configurationSettings';
import { RestClientSettingsVS } from './models/restClientSettingsVS';
RestClientSettings.Instance = new RestClientSettingsVS();
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { commands, ExtensionContext, languages, Range, TextDocument, Uri, window, workspace } from 'vscode';
import { CodeSnippetController } from './controllers/codeSnippetController';
import { EnvironmentController } from './controllers/environmentController';
import { HistoryController } from './controllers/historyController';
import { RequestController } from './controllers/requestController';
import { ResponseController } from './controllers/responseController';
import { CustomVariableDiagnosticsProvider } from "./providers/customVariableDiagnosticsProvider";
import { RequestBodyDocumentLinkProvider } from './providers/documentLinkProvider';
import { EnvironmentOrFileVariableHoverProvider } from './providers/environmentOrFileVariableHoverProvider';
import { FileVariableDefinitionProvider } from './providers/fileVariableDefinitionProvider';
import { FileVariableReferenceProvider } from './providers/fileVariableReferenceProvider';
import { FileVariableReferencesCodeLensProvider } from './providers/fileVariableReferencesCodeLensProvider';
import { HttpCodeLensProvider } from './providers/httpCodeLensProvider';
import { HttpCompletionItemProvider } from './providers/httpCompletionItemProvider';
import { HttpDocumentSymbolProvider } from './providers/httpDocumentSymbolProvider';
import { RequestVariableCompletionItemProvider } from "./providers/requestVariableCompletionItemProvider";
import { RequestVariableDefinitionProvider } from './providers/requestVariableDefinitionProvider';
import { RequestVariableHoverProvider } from './providers/requestVariableHoverProvider';
import { AadTokenCache } from './utils/aadTokenCache';
import { ConfigurationDependentRegistration } from './utils/dependentRegistration';
import { FileVariableProvider } from './utils/httpVariableProviders/fileVariableProvider';
import { SystemVariableProvider } from './utils/httpVariableProviders/systemVariableProvider';
import { VariableProcessor } from './utils/variableProcessor';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: ExtensionContext) {
    FileVariableProvider.Instance.systemVariableProvider = SystemVariableProvider.Instance;
    VariableProcessor.systemVariableProvider = SystemVariableProvider.Instance;
    const requestController = new RequestController(context);
    const historyController = new HistoryController();
    const responseController = new ResponseController();
    const codeSnippetController = new CodeSnippetController();
    const environmentController = new EnvironmentController(await EnvironmentController.getCurrentEnvironment());
    context.subscriptions.push(requestController);
    context.subscriptions.push(historyController);
    context.subscriptions.push(responseController);
    context.subscriptions.push(codeSnippetController);
    context.subscriptions.push(environmentController);
    context.subscriptions.push(commands.registerCommand('rest-client.request', ((document: TextDocument, range: Range) => requestController.run(range))));
    context.subscriptions.push(commands.registerCommand('rest-client.rerun-last-request', () => requestController.rerun()));
    context.subscriptions.push(commands.registerCommand('rest-client.cancel-request', () => requestController.cancel()));
    context.subscriptions.push(commands.registerCommand('rest-client.history', () => historyController.save()));
    context.subscriptions.push(commands.registerCommand('rest-client.clear-history', () => historyController.clear()));
    context.subscriptions.push(commands.registerCommand('rest-client.save-response', () => responseController.save()));
    context.subscriptions.push(commands.registerCommand('rest-client.save-response-body', () => responseController.saveBody()));
    context.subscriptions.push(commands.registerCommand('rest-client.copy-response-body', () => responseController.copyBody()));
    context.subscriptions.push(commands.registerCommand('rest-client.generate-codesnippet', () => codeSnippetController.run()));
    context.subscriptions.push(commands.registerCommand('rest-client.copy-codesnippet', () => codeSnippetController.copy()));
    context.subscriptions.push(commands.registerCommand('rest-client.copy-request-as-curl', () => codeSnippetController.copyAsCurl()));
    context.subscriptions.push(commands.registerCommand('rest-client.switch-environment', () => environmentController.switchEnvironment()));
    context.subscriptions.push(commands.registerCommand('rest-client.clear-aad-token-cache', () => AadTokenCache.clear()));
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
    context.subscriptions.push(languages.registerHoverProvider(documentSelector, new EnvironmentOrFileVariableHoverProvider()));
    context.subscriptions.push(languages.registerHoverProvider(documentSelector, new RequestVariableHoverProvider()));
    context.subscriptions.push(
        new ConfigurationDependentRegistration(
            () => languages.registerCodeLensProvider(documentSelector, new HttpCodeLensProvider()),
            s => s.enableSendRequestCodeLens));
    context.subscriptions.push(
        new ConfigurationDependentRegistration(
            () => languages.registerCodeLensProvider(documentSelector, new FileVariableReferencesCodeLensProvider()),
            s => s.enableCustomVariableReferencesCodeLens));
    context.subscriptions.push(languages.registerDocumentLinkProvider(documentSelector, new RequestBodyDocumentLinkProvider()));
    context.subscriptions.push(languages.registerDefinitionProvider(documentSelector, new FileVariableDefinitionProvider()));
    context.subscriptions.push(languages.registerDefinitionProvider(documentSelector, new RequestVariableDefinitionProvider()));
    context.subscriptions.push(languages.registerReferenceProvider(documentSelector, new FileVariableReferenceProvider()));
    context.subscriptions.push(languages.registerDocumentSymbolProvider(documentSelector, new HttpDocumentSymbolProvider()));

    const diagnosticsProvider = new CustomVariableDiagnosticsProvider();
    context.subscriptions.push(diagnosticsProvider);
}

// this method is called when your extension is deactivated
export function deactivate() {
}