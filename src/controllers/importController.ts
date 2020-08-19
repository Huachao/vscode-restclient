import { CancellationToken, window, Uri } from 'vscode';
import { trace } from '../utils/decorator';

export class ImportController {

    @trace('Import Requests From Document')
    public async import(token: CancellationToken) {
        const dialogOptions = { canSelectFiles: true, canSelectFolders: false, canSelectMany: false, title: 'Choose file that you wish to import' };
        window.showQuickPick(['Postman'], { canPickMany: false }, token).then(option => {
            window.showOpenDialog(dialogOptions).then(files => this.importFile(files?.pop(), option));
        });
    }

    private async importFile(file: Uri | undefined, option: string | undefined) {
        if (file === undefined) {
            window.showErrorMessage("File was not found.");
        }
        if (option === undefined) {
            window.showErrorMessage("Options was not found.");
        }
        
        /* 
        1. resolve importer based on option.
        2. map content from imported file to text in specific format.
        3. open new document with text (maybe we can use httpResponseTextDocumentView.ts)
        */
    }
}