'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { ExtensionContext, commands, languages, TextDocument, Range } from 'vscode';
import { RequestController } from './controllers/requestController';
import { HistoryController } from './controllers/historyController';
import { ResponseController } from './controllers/responseController';
import { CodeSnippetController } from './controllers/codeSnippetController';
import { EnvironmentController } from './controllers/environmentController';
import { HttpCompletionItemProvider } from './httpCompletionItemProvider';
import { CustomVariableHoverProvider } from './customVariableHoverProvider';
import { HttpCodeLensProvider } from './httpCodeLensProvider';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "rest-client" is now active!');

    let requestController = new RequestController();
    let historyController = new HistoryController();
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
    context.subscriptions.push(commands.registerCommand('rest-client.save-response', ResponseController.save));
    context.subscriptions.push(commands.registerCommand('rest-client.generate-codesnippet', () => codeSnippetController.run()));
    context.subscriptions.push(commands.registerCommand('rest-client.copy-codesnippet', () => codeSnippetController.copy()));
    context.subscriptions.push(commands.registerCommand('rest-client.switch-environment', () => environmentController.switchEnvironment()));
    context.subscriptions.push(languages.registerCompletionItemProvider('http', new HttpCompletionItemProvider()));
    context.subscriptions.push(languages.registerHoverProvider('http', new CustomVariableHoverProvider()))
    context.subscriptions.push(languages.registerCodeLensProvider('http', new HttpCodeLensProvider()))
}

// this method is called when your extension is deactivated
export function deactivate() {
}