'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { ExtensionContext, commands, window, workspace, Uri, StatusBarAlignment } from 'vscode';
import { RequestParser } from './parser'
import { HttpRequest } from './models/httpRequest'
import { RestClientSettings } from './models/configurationSettings'

var request = require('request')

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "rest-client" is now active!');

    let outChannel = window.createOutputChannel('REST');
    let statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left)
    let restClientSettings = new RestClientSettings();

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = commands.registerCommand('rest-client.request', () => {
        let editor = window.activeTextEditor;
        if (!editor || !editor.document) {
            return;
        }

        // Get selected text of selected lines or full document
        let selectedText: string;
        if (editor.selection.isEmpty) {
            selectedText = editor.document.getText();
        } else {
            selectedText = editor.document.getText(editor.selection);
        }

        if (selectedText === '') {
            return;
        }

        if (restClientSettings.clearOutput) {
            outChannel.clear();
        }

        // clear status bar
        statusBarItem.text = `$(cloud-upload)`;
        statusBarItem.show();

        // parse http request
        let httpRequest = RequestParser.parseHttpRequest(selectedText);
        if (!httpRequest) {
            return;
        }

        let options = {
            url: httpRequest.url,
            headers: httpRequest.headers,
            method: httpRequest.method,
            body: httpRequest.body,
            time: true,
            followRedirect: restClientSettings.followRedirect
        };

        if (!options.headers) {
            options.headers = {};
        }

        // add default user agent if not specified
        if (!options.headers['user-agent']) {
            options.headers['user-agent'] = restClientSettings.defaultUserAgent;
        }

        // send http request
        request(options, function(error, response, body) {
            statusBarItem.text = `$(cloud-download)`;
            if (error) {
                outChannel.appendLine(`${error}\n`);
                outChannel.show(true);
                return;
            }
            let duration = response.elapsedTime;
            let output = `HTTP/${response.httpVersion} ${response.statusCode} ${response.statusMessage}\n`
            for (var header in response.headers) {
                if (response.headers.hasOwnProperty(header)) {
                    var value = response.headers[header];
                    output += `${header}: ${value}\n`
                }
            }

            output += `\n${body}`;
            outChannel.appendLine(`${output}\n`);
            outChannel.show(true);

            statusBarItem.text += ` $(clock) ${duration}ms`;
            statusBarItem.tooltip = 'duration';
        })
    });

    context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {
}