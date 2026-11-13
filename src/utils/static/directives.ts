import { SnippetString } from 'vscode';

export interface DirectiveOption {
    name: string;
    detail: string;
    snippet?: SnippetString;
    insertText?: string;
}

export const DIRECTIVE_OPTIONS: DirectiveOption[] = [
    {
        name: '@name',
        detail: 'Name the request to reference it later',
        snippet: new SnippetString('name ${1:requestName}'),
    },
    {
        name: '@set',
        detail: 'Capture a value from the response into a variable',
        snippet: new SnippetString(
            'set ${1:varName} = ${2|response.body.,response.headers.|}${3:Header Name, *(Full Body), JSONPath or XPath}'
        ),
    },
    {
        name: '@prompt',
        detail: 'Prompt user input upon execution',
        snippet: new SnippetString('prompt ${1:varName} ${2:Prompt message}'),
    },
    {
        name: '@title',
        detail: 'Set a descriptive title for the request',
        snippet: new SnippetString('title ${1:Title}'),
    },
];
