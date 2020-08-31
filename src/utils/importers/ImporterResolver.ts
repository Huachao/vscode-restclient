import { ImportOption } from './../../models/enums/ImportOption';
import { IAmImporter } from './IAmImporter';
import { PostmanImporter } from './PostmanCollectionImporter';

export class ImporterResolver {
    resolve(option: ImportOption): IAmImporter {
        switch (option) {
            case ImportOption.Postman:
                return new PostmanImporter();
            default:
                throw new Error('There is no importer for specified import option.');
        }
    }
}