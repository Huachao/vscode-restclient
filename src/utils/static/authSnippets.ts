import { SnippetString } from 'vscode';
import { ElementType, HttpElement } from '../../models/httpElement';

export const AUTHENTICATION_SNIPPETS: HttpElement[] = [
    new HttpElement(
        'Basic Base64',
        ElementType.Authentication,
        '^\\s*Authorization\\s*\\:\\s*',
        'Base64 encoded username and password',
        new SnippetString('Basic ${1:base64-user-password}')
    ),
    new HttpElement(
        'Basic Raw Credential (Colon Separated)',
        ElementType.Authentication,
        '^\\s*Authorization\\s*\\:\\s*',
        'Raw username and password',
        new SnippetString('Basic ${1:username}:${2:password}')
    ),
    new HttpElement(
        'Basic Raw Credential (Space Separated)',
        ElementType.Authentication,
        '^\\s*Authorization\\s*\\:\\s*',
        'Raw username and password',
        new SnippetString('Basic ${1:username} ${2:password}')
    ),
    new HttpElement(
        'Digest',
        ElementType.Authentication,
        '^\\s*Authorization\\s*\\:\\s*',
        'Raw username and password',
        new SnippetString('Digest ${1:username} ${2:password}')
    ),
];
