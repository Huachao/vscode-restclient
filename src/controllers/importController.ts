import { Collection } from 'postman-collection';
import { CancellationToken, Uri, window, workspace } from 'vscode';
import { trace } from '../utils/decorator';
import { PostmanCollection, PostmanImporter } from './../utils/importers/PostmanCollectionImporter';

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

        if (option === 'Postman') {
            const fileContent = await workspace.fs.readFile(<Uri>file);
            const jsonObj = JSON.parse(fileContent.toString());

            const importer = new PostmanImporter();
            const collection = new Collection(jsonObj);
            const parsedContent = importer.import(<PostmanCollection>collection);
            const document = await workspace.openTextDocument({ language: 'http', content: parsedContent });
            await window.showTextDocument(document, { preview: false });
        }

        /*
        1. resolve importer based on option.
        2. map content from imported file to text in specific format.
        3. open new document with text (maybe we can use httpResponseTextDocumentView.ts)
        */
    }
}