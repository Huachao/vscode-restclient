import { EOL } from 'os';
import { Collection, PropertyList, Request, VariableList } from 'postman-collection';
import { ImporterUtilities } from './ImporterUtilities';


export class PostmanImporter {
    import(collection: PostmanCollection): string {
        let sb = '';

        sb += this.prepareDocumentHeader(collection.name, collection.description.content);
        sb += this.defineDocumentVariables(collection.variables);
        collection.items.each(entry => {
            sb += this.prepareGroupHeader(entry.name, entry.description.content);
            sb += this.writeAllRequestsInGroup(entry.items);
        }, this);

        return sb;
    }
    prepareGroupHeader(name: string, content: string): string {
        return '#\t' + name + EOL + '#\t' + ImporterUtilities.parseMultiLineStringAsMultiLineComment(content);
    }
    writeAllRequestsInGroup(items: PropertyList): string {
        let sb = '';
        items.each((element: { id: string; name: string; request: any; }) => {
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

    writeRequest(req: Request): string {
        let sb = `${req.method} ${req.url.getPath()}${EOL}`;

        req.headers.each((header: { key: any; value: any; }) => {
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
            `# ${ImporterUtilities.parseMultiLineStringAsMultiLineComment(description)}` + EOL;
    }

    defineDocumentVariables(variables: VariableList): string {
        let sb = '';

        variables.each(variable => {
            if (variable.description.content.length > 0) {
                sb += `// ${ImporterUtilities.parseMultiLineStringAsMultiLineComment(variable.description.content)}` + EOL;
            }

            sb += `@${variable.key} = ${variable.value}` + EOL;
        }, this);
        return sb;
    }
}

export class PostmanCollection extends Collection {
    description: { content: string };
}
