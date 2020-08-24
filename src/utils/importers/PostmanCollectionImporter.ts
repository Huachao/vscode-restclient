import { EOL } from 'os';
import { Collection, PostmanRequest, VariableList, PostmanPropertyList } from 'postman-collection';
import { ImporterUtilities } from './ImporterUtilities';

export interface PostmanItemGroup {

}

export class PostmanImporter {
    import(collection: any): string {
        let sb = '';
        const importedCollection = new Collection(collection);

        sb += this.prepareDocumentHeader(importedCollection.name, importedCollection.description.content);
        sb += this.defineDocumentVariables(importedCollection.variables);
        importedCollection.items.each(entry => {
            sb += this.prepareGroupHeader(entry.name, entry.description.content);
            sb += this.writeAllRequestsInGroup(entry.items);
        }, this);

        return sb;
    }
    prepareGroupHeader(name: string, content: string): string {
        return '#\t' + name + EOL + '#\t' + ImporterUtilities.parseStringAsComment(content);
    }
    writeAllRequestsInGroup(items: PostmanPropertyList): string {
        let sb = '';
        items.each(element => {
            sb += this.writeRequestHeader(element.id, element.name);
            const req = element.request;
            sb += this.writeRequest(req);
        }, this);
        return sb;
    }

    writeRequestHeader(id: string, name: string): string {
        return EOL +
            `# @name ${id}` + EOL +
            `# ${name}` + EOL;
    }

    writeRequest(req: PostmanRequest): string {
        let sb = `${req.method} ${req.url.getPath()}${EOL}`;

        req.headers.each(header => {
            sb += `${header.key}: ${header.value}` + EOL;
        }, this);

        if (req.body) {
            sb += req.body.toString() + EOL;
        }
        sb += EOL + '###' + EOL;

        return sb;
    }

    prepareDocumentHeader(name: string, description: string): string {
        return `# ${name}` + EOL +
            `#` + EOL +
            `# ${ImporterUtilities.parseStringAsComment(description)}` + EOL;
    }

    defineDocumentVariables(variables: VariableList): string {
        let sb = '';

        variables.each(variable => {
            if (variable.description.content.length > 0) {
                sb += `// ${ImporterUtilities.parseStringAsComment(variable.description.content)}` + EOL;
            }

            sb += `@${variable.key} = ${variable.value}` + EOL;
        }, this);
        return sb;
    }
}