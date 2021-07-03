import { EOL } from 'os';
import { Collection, HeaderList, Item, ItemGroup, Request, RequestAuth, Url, VariableList } from 'postman-collection';
import { Authorization } from '../../../models/auth/authorization';
import { IAmImporter } from '../IAmImporter';
import { ImporterUtilities } from '../ImporterUtilities';
import { PostmanAuthorization, PostmanAuthorizationParser } from './PostmanAuthorizationParser';

export class PostmanImporter implements IAmImporter {
    import(source: Uint8Array): string {
        const postmanCollection = this.getCollectionFromFileContent(source);
        if (postmanCollection == null) {
            throw 'Unrecognized document';
        }

        let sb = this.prepareDocumentHeader(postmanCollection.name, postmanCollection.description?.content);
        sb += this.defineDocumentVariables(postmanCollection.variables);
        postmanCollection.items.each(entry => sb += this.processAllRequests(entry, postmanCollection.auth), this);

        return sb;
    }

    private processAllRequests(entry: any, auth: RequestAuth | undefined) {
        let sb = '';

        if (entry instanceof ItemGroup) {
            sb += this.prepareGroupHeader(entry.name, (<any>entry)?.description?.content);
            entry.items?.each(e => ((el, auth) => sb += this.processAllRequests(el, auth))(e, entry.auth), this);
        } else if (entry instanceof Item) {
            sb += this.validateRequest(entry) ? this.writeRequestWithHeader(entry, auth) : '';
        } else {
            throw 'Unrecognized entry type.\n Don\'t know what to do with that.'
        }

        return sb;
    }

    private validateRequest(entry: Item): boolean {
        let isValid = entry?.request?.url?.getRaw() != null;
        isValid = isValid && entry?.id != null;
        isValid = isValid && entry?.name != null;
        return isValid;
    }


    private getCollectionFromFileContent(source: Uint8Array) {
        const collection = new Collection(<any>JSON.parse(source.toString()));
        const postmanCollection = <PostmanCollection>collection;
        return postmanCollection;
    }

    private prepareGroupHeader(name: string, content: string | undefined): string {
        return '#\t' + name + EOL + ImporterUtilities.parseMultiLineStringAsMultiLineComment('#\t\t', content);
    }


    private writeRequestWithHeader(element: { id: string; name: string; request: any; }, auth: RequestAuth | undefined) {
        let sb = this.writeRequestHeader(element.id, element.name);
        let reqAuth: Authorization | undefined;
        if (auth) {
            reqAuth = PostmanAuthorizationParser.parse(<PostmanAuthorization><unknown>auth);
        }

        sb += this.writeRequest(element.id, element.request, reqAuth);
        return sb;
    }

    private writeRequestHeader(id: string, name: string): string {
        return EOL +
            `# @name ${id}` + EOL +
            `# ${name}` + EOL;
    }

    private writeRequest(requestId: string, req: Request, auth: Authorization | undefined): string {
        let sb = this.writeRequestVariables(requestId, req.url.variables);
        sb += this.writeRequestUrl(requestId, req.method, req.url);

        sb += this.addAuthHeaderForRequest(req.headers, auth);

        req.headers?.each((header: { key: any; value: any; }) => {
            sb += `${header.key}: ${header.value}` + EOL;
        }, this);

        if (req.body) {
            sb += req.body.toString() + EOL;
        }
        sb += EOL + '###' + EOL;

        return sb;
    }

    private addAuthHeaderForRequest(headers: HeaderList, auth: Authorization | undefined): string {
        const authorizationKeyRegex = new RegExp('Authorization');
        const already_existing_authorization_header = headers?.find((h: { key: string; value: string; }) => h.key.match(authorizationKeyRegex));
        if (already_existing_authorization_header) {
            return '';
        } else {
            return auth?.toString() ?? '';
        }
    }

    private writeRequestUrl(id: string, method: string, url: Url) {
        return method + ' ' + this.getRequestPath(id, url) + this.addQueryParamsIfNeeded(url) + EOL
    }

    private writeRequestVariables(id: string, variables: VariableList | undefined): string {
        let sb = '';
        variables?.each((variable) => {
            sb += `@${id + variable.key?.replace(' ', '_')} = ` + variable.value + EOL;
        }, this);
        return sb;
    }

    private addQueryParamsIfNeeded(url: Url) {
        return (url.query.count() > 0 ? `?${url.getQueryString()}` : '');
    }

    private getRequestPath(requestId: string, url: Url): string {
        let sb = url.getHost() + '/';

        url.path?.forEach(w => {
            const variableKey = w.replace(":", "");
            if (url.variables.get(variableKey) != null) {
                sb += '{{' + requestId + variableKey + '}}/';
            } else {
                sb += w + '/';
            }
        }, this);

        return sb.slice(0, -1);
    }

    private prepareDocumentHeader(name: string, description: string | undefined): string {
        return `# ${name}` + EOL +
            `#` + EOL +
            ImporterUtilities.parseMultiLineStringAsMultiLineComment('#\t', description) + EOL;
    }

    private defineDocumentVariables(variables: VariableList): string {
        let sb = '';

        variables.each(variable => {
            if (variable?.description?.content) {
                sb += ImporterUtilities.parseMultiLineStringAsMultiLineComment('// ', variable.description.content) + EOL;
            }

            sb += `@${variable.key?.replace(' ', '_')} = ${variable.value}` + EOL;
        }, this);
        return sb + EOL + '###' + EOL;
    }
}

export class PostmanCollection extends Collection {
    description: { content: string };
}
