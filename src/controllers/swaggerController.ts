import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import dayjs from 'dayjs';
import { SwaggerUtils } from '../utils/swaggerUtils';

export class SwaggerController {
    private swaggerUtils: SwaggerUtils;

    public constructor(private context: vscode.ExtensionContext) {
        this.swaggerUtils = new SwaggerUtils();
    }

    async import() {
        const existingFiles = this.context.workspaceState.get<{ [fileName: string]: { content: string, timestamp: number } }>('importedFiles') || {};
        const importFromFileItem: vscode.QuickPickItem = {
            label: 'Import from file...',
            detail: 'Import from Swagger/OpenAPI',
        };
        const recentImportsItems: vscode.QuickPickItem[] = Object.keys(existingFiles).map((fileName) => ({
            label: fileName,
            detail: `${dayjs().to(existingFiles[fileName].timestamp)}`,
        }));
        const clearStateItem: vscode.QuickPickItem = {
            label: 'Clear imported files',
        };
        const items = [importFromFileItem, ...recentImportsItems];
        if (recentImportsItems.length > 0) {
            items.push(clearStateItem);
        }
        const selectedItem = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select an option',
        });

        // Handle the user's selection  
        if (selectedItem) {
            if (selectedItem === importFromFileItem) {
                const options: vscode.OpenDialogOptions = {
                    canSelectMany: false,
                    openLabel: 'Import',
                    filters: {
                        'YAML and JSON files': ['yml', 'yaml', 'json'],
                    },
                };

                const fileUri = await vscode.window.showOpenDialog(options);
                if (fileUri && fileUri[0]) {
                    const fileContent = fs.readFileSync(fileUri[0].fsPath, 'utf8');
                    const fileName = path.basename(fileUri[0].fsPath);
                    this.createNewFileWithProcessedContent(fileContent);
                    this.storeImportedFile(fileName, fileContent);
                }
            } else if (selectedItem === clearStateItem) {
                this.clearImportedFiles();
                vscode.window.showInformationMessage('Imported files have been cleared.');
            } else {
                const selectedFile = selectedItem.label;
                const fileContent = existingFiles[selectedFile];
                this.createNewFileWithProcessedContent(fileContent.content);
            }
        } else {
            vscode.window.showInformationMessage('No option selected');
        }
    }

    private storeImportedFile(fileName: string, content: string) {
        const existingFiles = this.context.workspaceState.get<{ [fileName: string]: { content: string, timestamp: number } }>('importedFiles') || {};
        existingFiles[fileName] = {
            content,
            timestamp: Date.now(),
        };
        this.context.workspaceState.update('importedFiles', existingFiles);
    }

    private clearImportedFiles() {
        this.context.workspaceState.update('importedFiles', {});
    }

    async createNewFileWithProcessedContent(originalContent: string) {
        try {
            const processedContent = this.swaggerUtils.parseOpenApiYaml(originalContent);
            const newFile = await vscode.workspace.openTextDocument({
                content: processedContent,
                language: 'http',
            });
            vscode.window.showTextDocument(newFile);
        } catch (error) {
            vscode.window.showErrorMessage(error.message);
        }
    }
}  
