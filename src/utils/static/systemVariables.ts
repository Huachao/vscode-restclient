import { SnippetString } from 'vscode';
import * as Constants from '../../common/constants';
import { ElementType, HttpElement } from '../../models/httpElement';

export function getSystemVariableSnippets(): HttpElement[] {
    const elements: HttpElement[] = [
        new HttpElement(
            Constants.FakerVariableName,
            ElementType.SystemVariable,
            null,
            Constants.FakerVariableDescription,
            new SnippetString(`{{$\${name:${Constants.FakerVariableName.slice(1)}} \${1:internet.email}}}`)),
        new HttpElement(
            Constants.GuidVariableName,
            ElementType.SystemVariable,
            null,
            Constants.GuidVariableDescription,
            new SnippetString(`{{$\${name:${Constants.GuidVariableName.slice(1)}}}}`)
        ),
        new HttpElement(
            Constants.TimeStampVariableName,
            ElementType.SystemVariable,
            null,
            Constants.TimeStampVariableDescription,
            new SnippetString(`{{$\${name:${Constants.TimeStampVariableName.slice(1)}}}}`)
        ),
        new HttpElement(
            Constants.DateTimeVariableName,
            ElementType.SystemVariable,
            null,
            Constants.DateTimeVariableNameDescription,
            new SnippetString(
                `{{$\${name:${Constants.DateTimeVariableName.slice(1)}} \${1|rfc1123,iso8601|}}}`
            )
        ),
        new HttpElement(
            Constants.LocalDateTimeVariableName,
            ElementType.SystemVariable,
            null,
            Constants.LocalDateTimeVariableNameDescription,
            new SnippetString(
                `{{$\${name:${Constants.LocalDateTimeVariableName.slice(1)}} \${1|rfc1123,iso8601|}}}`
            )
        ),
        new HttpElement(
            Constants.RandomIntVariableName,
            ElementType.SystemVariable,
            null,
            Constants.RandomIntDescription,
            new SnippetString(
                `{{$\${name:${Constants.RandomIntVariableName.slice(1)}} \${1:min} \${2:max}}}`
            )
        ),
        new HttpElement(
            Constants.ProcessEnvVariableName,
            ElementType.SystemVariable,
            null,
            Constants.ProcessEnvDescription,
            new SnippetString(
                `{{$\${name:${Constants.ProcessEnvVariableName.slice(1)}} \${2:process environment variable name}}}`
            )
        ),
        new HttpElement(
            Constants.DotenvVariableName,
            ElementType.SystemVariable,
            null,
            Constants.DotenvDescription,
            new SnippetString(
                `{{$\${name:${Constants.DotenvVariableName.slice(1)}} \${2:.env variable name}}}`
            )
        ),
        new HttpElement(
            Constants.SecretVariableName,
            ElementType.SystemVariable,
            null,
            Constants.SecretDescription,
            new SnippetString(
                `{{$\${name:${Constants.SecretVariableName.slice(1)}} \${2:SECRET_NAME}}}`
            )
        ),
        new HttpElement(
            Constants.UuidVariableName,
            ElementType.SystemVariable,
            null,
            Constants.UuidDescription,
            new SnippetString(`{{$\${name:${Constants.UuidVariableName.slice(1)}}}}`)
        ),
        new HttpElement(
            Constants.IsoTimestampVariableName,
            ElementType.SystemVariable,
            null,
            Constants.IsoTimestampDescription,
            new SnippetString(`{{$\${name:${Constants.IsoTimestampVariableName.slice(1)}}}}`)
        ),
        new HttpElement(
            Constants.RandomIntegerJetBrainsVariableName,
            ElementType.SystemVariable,
            null,
            Constants.RandomIntegerJetBrainsDescription,
            new SnippetString(
                `{{$\${name:${Constants.RandomIntegerJetBrainsVariableName.slice(1)}}(\${1:min},\${2:max})}}`
            )
        ),
        new HttpElement(
            Constants.OidcVariableName,
            ElementType.SystemVariable,
            null,
            Constants.OidcDescription,
            new SnippetString(`{{$\${name:${Constants.OidcVariableName.slice(1)}}}}`)
        ),
        new HttpElement(
            Constants.AzureActiveDirectoryV2TokenVariableName,
            ElementType.SystemVariable,
            null,
            Constants.AzureActiveDirectoryV2TokenDescription,
            new SnippetString(
                `{{$\${name:${Constants.AzureActiveDirectoryV2TokenVariableName.slice(1)}}}}`
            )
        ),
    ];

    return elements;
}
