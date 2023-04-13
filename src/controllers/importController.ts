import { CancellationToken, Uri, window, workspace } from 'vscode';
import { ImportOption } from '../models/enums/ImportOption';
import { trace } from '../utils/decorator';
import { ImporterResolver } from './../utils/importers/ImporterResolver';

const DocumentResultLanguage = 'http';
const ImportDialogTitle = 'Choose file that you wish to import';
export class ImportController {

    private _resolver: ImporterResolver;

    constructor() {
        this._resolver = new ImporterResolver();
    }

    @trace('Import Requests From Document')
    public async import(token: CancellationToken) {
        const options = Object.keys(ImportOption).map(k => ImportOption[k]);

        const pickedOption = await window.showQuickPick(options, { canPickMany: false }, token);
        if (pickedOption === undefined) {
            return;
        }

        await this.selectFileAndImport(pickedOption);
    }

    async selectFileAndImport(selectedOption: any) {
        const dialogOptions = { canSelectFiles: true, canSelectFolders: false, canSelectMany: false, title: ImportDialogTitle };

        const pickedFiles = await window.showOpenDialog(dialogOptions);
        const pickedFile = <Uri | undefined>pickedFiles?.pop();
        if (pickedFile === undefined) {
            return;
        }

        await this.resolveImporterAndUseIt(pickedFile, selectedOption);
    }

    async resolveImporterAndUseIt(file: Uri, option: ImportOption) {
        const content = await workspace.fs.readFile(file);
        const importer = this._resolver.resolve(option);
        const result = importer.import(content);
        const document = await workspace.openTextDocument({ language: DocumentResultLanguage, content: result });
        await window.showTextDocument(document, { preview: false });
    }
}