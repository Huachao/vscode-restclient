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
            sb += this.writeRequest(element.id, req);
        }, this);
        return sb;
    }

    writeRequestHeader(id: string, name: string): string {
        return EOL +
            `# @name ${id}` + EOL +
            `# ${name}` + EOL;
    }

    writeRequest(requestId: string, req: Request): string {
        let sb = '';
        if (requestId === 'get3DRevisions') {
            debugger;
        }

        req.url.variables.each((variable) => {
            sb += `@${requestId + variable.key} = ` + variable.value + EOL;
        }, this);

        sb += `${req.method} ` + this.getRequestPath(requestId, req) + this.addQueryParamsIfNeeded(req) + EOL;

        req.headers.each((header: { key: any; value: any; }) => {
            sb += `${header.key}: ${header.value}` + EOL;
        }, this);

        if (req.body) {
            sb += req.body.toString() + EOL;
        }
        sb += EOL + '###' + EOL;

        return sb;
    }

    private addQueryParamsIfNeeded(req: Request) {
        return (req.url.query.count() > 0 ? `?${req.url.getQueryString()}` : '');
    }

    getRequestPath(requestId: string, req: Request): string {
        let sb = req.url.getHost() + '/';

        req.url.path.forEach(w => {
            const variableKey = w.replace(":", "");
            if (req.url.variables.get(variableKey) !== undefined) {
                sb += '{{' + requestId + variableKey + '}}/';
            } else {
                sb += w + '/';
            }
        }, this);

        return sb.slice(0, -1);
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
