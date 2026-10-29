'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { ExtensionContext, l10n, languages, Range, TextDocument, Uri, window, workspace } from 'vscode';
import { registerCommandSafely, warnIfCommandsClash } from './utils/safeCommands';
import { SecretStore } from './utils/secrets';
import { registerTools } from './utils/lmTools';
import { CodeSnippetController } from './controllers/codeSnippetController';
import { EnvironmentController } from './controllers/environmentController';
import { HistoryController } from './controllers/historyController';
import { RequestController } from './controllers/requestController';
import { SwaggerController } from './controllers/swaggerController';
import { CustomVariableDiagnosticsProvider } from "./providers/customVariableDiagnosticsProvider";
import { RequestBodyDocumentLinkProvider } from './providers/documentLinkProvider';
import { EnvironmentOrFileVariableHoverProvider } from './providers/environmentOrFileVariableHoverProvider';
import { FileVariableDefinitionProvider } from './providers/fileVariableDefinitionProvider';
import { FileVariableReferenceProvider } from './providers/fileVariableReferenceProvider';
import { FileVariableReferencesCodeLensProvider } from './providers/fileVariableReferencesCodeLensProvider';
import { HttpCodeLensProvider } from './providers/httpCodeLensProvider';
import { HttpCompletionItemProvider } from './providers/httpCompletionItemProvider';
import { HttpDocumentSymbolProvider } from './providers/httpDocumentSymbolProvider';
import { MarkdownCodeLensProvider } from './providers/markdownCodeLensProvider';
import { RequestVariableCompletionItemProvider } from "./providers/requestVariableCompletionItemProvider";
import { RequestVariableDefinitionProvider } from './providers/requestVariableDefinitionProvider';
import { RequestVariableHoverProvider } from './providers/requestVariableHoverProvider';
import { ConfigurationDependentRegistration } from './utils/dependentRegistration';
import { UserDataManager } from './utils/userDataManager';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: ExtensionContext) {
    await UserDataManager.initialize();
    SecretStore.initialize(context.secrets, context.globalState);

    const requestController = new RequestController(context);
    const historyController = new HistoryController();
    const codeSnippetController = new CodeSnippetController(context);
    const environmentController = await EnvironmentController.create();
    const swaggerController = new SwaggerController(context);
    context.subscriptions.push(requestController);
    context.subscriptions.push(historyController);
    context.subscriptions.push(codeSnippetController);
    context.subscriptions.push(environmentController);
    context.subscriptions.push(registerCommandSafely('rest-client.request', ((document: TextDocument, range: Range) => requestController.run(range))));
    context.subscriptions.push(registerCommandSafely('rest-client.rerun-last-request', () => requestController.rerun()));
    context.subscriptions.push(registerCommandSafely('rest-client.cancel-request', () => requestController.cancel()));
    context.subscriptions.push(registerCommandSafely('rest-client.history', () => historyController.save()));
    context.subscriptions.push(registerCommandSafely('rest-client.clear-history', () => historyController.clear()));
    context.subscriptions.push(registerCommandSafely('rest-client.generate-codesnippet', () => codeSnippetController.run()));
    context.subscriptions.push(registerCommandSafely('rest-client.copy-request-as-curl', () => codeSnippetController.copyAsCurl()));
    context.subscriptions.push(registerCommandSafely('rest-client.switch-environment', (name?: string) => environmentController.switchEnvironment(typeof name === 'string' ? name : undefined)));
    // With arguments it asks nothing: the tests and automations use this.
    context.subscriptions.push(registerCommandSafely('rest-client.set-secret', async (name?: string, value?: string) => {
        if (typeof name !== 'string') {
            name = await window.showInputBox({
                prompt: l10n.t('Secret name (use it as {{$secret NAME}})'),
                validateInput: v => (SecretStore.isValidName(v) ? undefined : l10n.t('Letters, digits, dots, dashes and underscores only')),
            });
        }
        if (!name || !SecretStore.isValidName(name)) {
            return;
        }
        if (typeof value !== 'string') {
            value = await window.showInputBox({ prompt: l10n.t('Value for secret "{0}" (stored encrypted, never written to the file)', name), password: true, ignoreFocusOut: true });
        }
        if (value === undefined || value === '') {
            return;
        }
        await SecretStore.set(name, value);
        window.setStatusBarMessage(l10n.t('Secret "{0}" saved', name), 4000);
    }));
    context.subscriptions.push(registerCommandSafely('rest-client.delete-secret', async (name?: string) => {
        if (typeof name !== 'string') {
            const names = SecretStore.names();
            if (names.length === 0) {
                window.showInformationMessage(l10n.t('There are no secrets stored'));
                return;
            }
            name = await window.showQuickPick(names, { placeHolder: l10n.t('Secret to delete') });
        }
        if (!name) {
            return;
        }
        await SecretStore.remove(name);
        window.setStatusBarMessage(l10n.t('Secret "{0}" deleted', name), 4000);
    }));
    context.subscriptions.push(registerCommandSafely('rest-client.clear-cookies', () => requestController.clearCookies()));
    context.subscriptions.push(registerCommandSafely('vscode-restclient._openDocumentLink', args => {
        workspace.openTextDocument(Uri.parse(args.path)).then(window.showTextDocument, error => {
            window.showErrorMessage(error.message);
        });
    }));
    context.subscriptions.push(registerCommandSafely('rest-client.import-swagger', async () => swaggerController.import()));


    const documentSelector = [
        { language: 'http', scheme: '*' }
    ];

    const mdDocumentSelector = [
        { language: 'markdown', scheme: '*' }
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
    context.subscriptions.push(
        new ConfigurationDependentRegistration(
            () => languages.registerCodeLensProvider(mdDocumentSelector, new MarkdownCodeLensProvider()),
            s => s.enableSendRequestCodeLens));
    context.subscriptions.push(languages.registerDocumentLinkProvider(documentSelector, new RequestBodyDocumentLinkProvider()));
    context.subscriptions.push(languages.registerDefinitionProvider(documentSelector, new FileVariableDefinitionProvider()));
    context.subscriptions.push(languages.registerDefinitionProvider(documentSelector, new RequestVariableDefinitionProvider()));
    context.subscriptions.push(languages.registerReferenceProvider(documentSelector, new FileVariableReferenceProvider()));
    context.subscriptions.push(languages.registerDocumentSymbolProvider(documentSelector, new HttpDocumentSymbolProvider()));

    const diagnosticsProvider = new CustomVariableDiagnosticsProvider();
    context.subscriptions.push(diagnosticsProvider);

    registerTools(context, requestController);

    warnIfCommandsClash();
}

// this method is called when your extension is deactivated
export function deactivate() {
}
