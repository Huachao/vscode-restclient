"use strict";

import * as url from 'url';
import { MarkdownString, SnippetString, TextDocument } from 'vscode';
import * as Constants from '../common/constants';
import { ElementType, HttpElement } from '../models/httpElement';
import { EnvironmentVariableProvider } from './httpVariableProviders/environmentVariableProvider';
import { FileVariableProvider } from './httpVariableProviders/fileVariableProvider';
import { RequestVariableProvider } from './httpVariableProviders/requestVariableProvider';
import { PersistUtility } from './persistUtility';

export class HttpElementFactory {
    public static async getHttpElements(document: TextDocument, line: string): Promise<HttpElement[]> {
        const originalElements: HttpElement[] = [];

        // add http methods
        originalElements.push(new HttpElement('GET', ElementType.Method));
        originalElements.push(new HttpElement('POST', ElementType.Method));
        originalElements.push(new HttpElement('PUT', ElementType.Method));
        originalElements.push(new HttpElement('DELETE', ElementType.Method));
        originalElements.push(new HttpElement('PATCH', ElementType.Method));
        originalElements.push(new HttpElement('HEAD', ElementType.Method));
        originalElements.push(new HttpElement('OPTIONS', ElementType.Method));
        originalElements.push(new HttpElement('TRACE', ElementType.Method));
        originalElements.push(new HttpElement('CONNECT', ElementType.Method));

        // add http headers
        originalElements.push(new HttpElement('Accept', ElementType.Header, null, 'Specify certain media types which are acceptable for the response'));
        originalElements.push(new HttpElement('Accept-Charset', ElementType.Header, null, 'Indicate what character sets are acceptable for the response'));
        originalElements.push(new HttpElement('Accept-Encoding', ElementType.Header, null, 'Indicate the content-codings that are acceptable in the response'));
        originalElements.push(new HttpElement('Accept-Language', ElementType.Header, null, 'Indicate the set of natural languages that are preferred as a response to the request'));
        originalElements.push(new HttpElement('Accept-Datetime', ElementType.Header, null, 'Indicate it wants to access a past state of an original resource'));
        originalElements.push(new HttpElement('Authorization', ElementType.Header, null, 'Consists of credentials containing the authentication information of the user agent for the realm of the resource being requested'));
        originalElements.push(new HttpElement('Cache-Control', ElementType.Header, null, 'Specify directives that MUST be obeyed by all caching mechanisms along the request/response chain'));
        originalElements.push(new HttpElement('Connection', ElementType.Header, null, 'Specify options that are desired for that particular connection and MUST NOT be communicated by proxies over further connections'));
        originalElements.push(new HttpElement('Content-Length', ElementType.Header, null, 'Indicate the size of the entity-body'));
        originalElements.push(new HttpElement('Content-MD5', ElementType.Header, null, 'Provide an end-to-end message integrity check of the entity-body'));
        originalElements.push(new HttpElement('Content-Type', ElementType.Header, null, 'Indicate the media type of the entity-body sent to the recipient or, in the case of the HEAD method, the media type that would have been sent had the request been a GET'));
        originalElements.push(new HttpElement('Cookie', ElementType.Header, null, 'An HTTP cookie previously sent by the server with Set-Cookie'));
        originalElements.push(new HttpElement('Date', ElementType.Header, null, 'Represent the date and time at which the message was originated'));
        originalElements.push(new HttpElement('Expect', ElementType.Header, null, 'Indicate that particular server behaviors are required by the client'));
        originalElements.push(new HttpElement('Forwarded', ElementType.Header, null, 'Disclose original information of a client connecting to a web server through an HTTP proxy'));
        originalElements.push(new HttpElement('From', ElementType.Header, null, 'The email address of the user making the request'));
        originalElements.push(new HttpElement('Host', ElementType.Header, null, 'Specify the Internet host and port number of the resource being requested'));
        originalElements.push(new HttpElement('If-Match', ElementType.Header, null, 'Only perform the action if the client supplied entity matches the same entity on the server. This is mainly for methods like PUT to only update a resource if it has not been modified since the user last updated it'));
        originalElements.push(new HttpElement('If-Modified-Since', ElementType.Header, null, 'Allows a 304 Not Modified to be returned if content is unchanged since the time specified in this field'));
        originalElements.push(new HttpElement('If-None-Match', ElementType.Header, null, 'Allows a 304 Not Modified to be returned if content is unchanged for ETag'));
        originalElements.push(new HttpElement('If-Range', ElementType.Header, null, 'If the entity is unchanged, send me the part(s) that I am missing; otherwise, send me the entire new entity.'));
        originalElements.push(new HttpElement('If-Unmodified-Since', ElementType.Header, null, 'Only send the response if the entity has not been modified since a specific time'));
        originalElements.push(new HttpElement('Max-Forwards', ElementType.Header, null, 'Provide a mechanism with the TRACE and OPTIONS methods to limit the number of proxies or gateways that can forward the request to the next inbound server'));
        originalElements.push(new HttpElement('Origin', ElementType.Header, null, 'Initiate a request for cross-origin resource sharing'));
        originalElements.push(new HttpElement('Pragma', ElementType.Header, null, 'Include implementation-specific directives that might apply to any recipient along the request/response chain'));
        originalElements.push(new HttpElement('Proxy-Authorization', ElementType.Header, null, 'Allows the client to identify itself (or its user) to a proxy which requires authentication'));
        originalElements.push(new HttpElement('Range', ElementType.Header, null, 'Request only part of an entity. Bytes are numbered from 0'));
        originalElements.push(new HttpElement('Referer', ElementType.Header, null, 'Allow the client to specify, for the server\'s benefit, the address (URI) of the resource from which the Request-URI was obtained'));
        originalElements.push(new HttpElement('TE', ElementType.Header, null, 'Indicate what extension transfer-codings it is willing to accept in the response and whether or not it is willing to accept trailer fields in a chunked transfer-coding'));
        originalElements.push(new HttpElement('Upgrade', ElementType.Header, null, 'Allow the client to specify what additional communication protocols it supports and would like to use if the server finds it appropriate to switch protocols'));
        originalElements.push(new HttpElement('User-Agent', ElementType.Header, null, 'Contain information about the user agent originating the request'));
        originalElements.push(new HttpElement('Via', ElementType.Header, null, 'Indicate the intermediate protocols and recipients between the user agent and the server on requests, and between the origin server and the client on responses'));
        originalElements.push(new HttpElement('Warning', ElementType.Header, null, 'Carry additional information about the status or transformation of a message which might not be reflected in the message'));
        originalElements.push(new HttpElement('X-Http-Method-Override', ElementType.Header, null, 'Requests a web application override the method specified in the request (typically POST) with the method given in the header field (typically PUT or DELETE). Can be used when a user agent or firewall prevents PUT or DELETE methods from being sent directly'));

        // add value for specific header like Accept and Content-Type
        originalElements.push(new HttpElement("application/json", ElementType.MIME, '^\\s*(Content-Type|Accept)\\s*\\:\\s*'));
        originalElements.push(new HttpElement("application/xml", ElementType.MIME, '^\\s*(Content-Type|Accept)\\s*\\:\\s*'));
        originalElements.push(new HttpElement("application/javascript", ElementType.MIME, '^\\s*(Content-Type|Accept)\\s*\\:\\s*'));
        originalElements.push(new HttpElement("application/xhtml+xml", ElementType.MIME, '^\\s*(Content-Type|Accept)\\s*\\:\\s*'));
        originalElements.push(new HttpElement("application/octet-stream", ElementType.MIME, '^\\s*(Content-Type|Accept)\\s*\\:\\s*'));
        originalElements.push(new HttpElement("application/soap+xml", ElementType.MIME, '^\\s*(Content-Type|Accept)\\s*\\:\\s*'));
        originalElements.push(new HttpElement("application/zip", ElementType.MIME, '^\\s*(Content-Type|Accept)\\s*\\:\\s*'));
        originalElements.push(new HttpElement("application/gzip", ElementType.MIME, '^\\s*(Content-Type|Accept)\\s*\\:\\s*'));
        originalElements.push(new HttpElement("application/x-www-form-urlencoded", ElementType.MIME, '^\\s*(Content-Type|Accept)\\s*\\:\\s*'));
        originalElements.push(new HttpElement("image/gif", ElementType.MIME, '^\\s*(Content-Type|Accept)\\s*\\:\\s*'));
        originalElements.push(new HttpElement("image/jpeg", ElementType.MIME, '^\\s*(Content-Type|Accept)\\s*\\:\\s*'));
        originalElements.push(new HttpElement("image/png", ElementType.MIME, '^\\s*(Content-Type|Accept)\\s*\\:\\s*'));
        originalElements.push(new HttpElement("message/http", ElementType.MIME, '^\\s*(Content-Type|Accept)\\s*\\:\\s*'));
        originalElements.push(new HttpElement("multipart/form-data", ElementType.MIME, '^\\s*(Content-Type|Accept)\\s*\\:\\s*'));
        originalElements.push(new HttpElement("text/css", ElementType.MIME, '^\\s*(Content-Type|Accept)\\s*\\:\\s*'));
        originalElements.push(new HttpElement("text/csv", ElementType.MIME, '^\\s*(Content-Type|Accept)\\s*\\:\\s*'));
        originalElements.push(new HttpElement("text/html", ElementType.MIME, '^\\s*(Content-Type|Accept)\\s*\\:\\s*'));
        originalElements.push(new HttpElement("text/plain", ElementType.MIME, '^\\s*(Content-Type|Accept)\\s*\\:\\s*'));
        originalElements.push(new HttpElement("text/xml", ElementType.MIME, '^\\s*(Content-Type|Accept)\\s*\\:\\s*'));

        // add Basic, Digest Authentication snippet
        originalElements.push(new HttpElement("Basic Base64", ElementType.Authentication, '^\\s*Authorization\\s*\\:\\s*', "Base64 encoded username and password", new SnippetString(`Basic \${1:base64-user-password}`)));
        originalElements.push(new HttpElement("Basic Raw Credential", ElementType.Authentication, '^\\s*Authorization\\s*\\:\\s*', "Raw username and password", new SnippetString(`Basic \${1:username} \${2:password}`)));
        originalElements.push(new HttpElement("Digest", ElementType.Authentication, '^\\s*Authorization\\s*\\:\\s*', "Raw username and password", new SnippetString(`Digest \${1:username} \${2:password}`)));

        // add global variables
        originalElements.push(new HttpElement(
            Constants.GuidVariableName,
            ElementType.SystemVariable,
            null,
            Constants.GuidVariableDescription,
            new SnippetString(`{{$\${name:${Constants.GuidVariableName.slice(1)}}}}`)));
        originalElements.push(new HttpElement(
            Constants.TimeStampVariableName,
            ElementType.SystemVariable,
            null,
            Constants.TimeStampVariableDescription,
            new SnippetString(`{{$\${name:${Constants.TimeStampVariableName.slice(1)}}}}`)));
        originalElements.push(new HttpElement(
            Constants.DateTimeVariableName,
            ElementType.SystemVariable,
            null,
            Constants.DateTimeVariableNameDescription,
            new SnippetString(`{{$\${name:${Constants.DateTimeVariableName.slice(1)}} \${1|rfc1123,iso8601|}}}`)));
        originalElements.push(new HttpElement(
            Constants.LocalDateTimeVariableName,
            ElementType.SystemVariable,
            null,
            Constants.LocalDateTimeVariableNameDescription,
            new SnippetString(`{{$\${name:${Constants.LocalDateTimeVariableName.slice(1)}} \${1|rfc1123,iso8601|}}}`)));
        originalElements.push(new HttpElement(
            Constants.RandomIntVariableName,
            ElementType.SystemVariable,
            null,
            Constants.RandomIntDescription,
            new SnippetString(`{{$\${name:${Constants.RandomIntVariableName.slice(1)}} \${1:min} \${2:max}}}`)));
        originalElements.push(new HttpElement(
            Constants.ProcessEnvVariableName,
            ElementType.SystemVariable,
            null,
            Constants.ProcessEnvDescription,
            new SnippetString(`{{$\${name:${Constants.ProcessEnvVariableName.slice(1)}} \${2:process environment variable name}}}`)
        ));
        originalElements.push(new HttpElement(
            Constants.DotenvVariableName,
            ElementType.SystemVariable,
            null,
            Constants.DotenvDescription,
            new SnippetString(`{{$\${name:${Constants.DotenvVariableName.slice(1)}} \${2:.env variable name}}}`)
        ));
        originalElements.push(new HttpElement(
            Constants.AzureActiveDirectoryVariableName,
            ElementType.SystemVariable,
            null,
            Constants.AzureActiveDirectoryDescription,
            new SnippetString(`{{$\${name:${Constants.AzureActiveDirectoryVariableName.slice(1)}}}}`)));

        // add environment custom variables
        const environmentVariables = await EnvironmentVariableProvider.Instance.getAll();
        for (const { name, value } of environmentVariables) {
            originalElements.push(
                new HttpElement(
                    name,
                    ElementType.EnvironmentCustomVariable,
                    null,
                    new MarkdownString(`Value: \`${value}\``),
                    new SnippetString(`{{${name}}}`)));
        }

        // add file custom variables
        const fileVariables = await FileVariableProvider.Instance.getAll(document);
        for (const { name, value } of fileVariables) {
            originalElements.push(
                new HttpElement(
                    name,
                    ElementType.FileCustomVariable,
                    '^\\s*[^@]',
                    new MarkdownString(`Value: \`${value}\``),
                    new SnippetString(`{{${name}}}`)));
        }

        // add request variables
        const requestVariables = await RequestVariableProvider.Instance.getAll(document);
        for (const { name, value } of requestVariables) {
            const v = new MarkdownString(`Value: Request Variable ${name}${value ? '' : ' *(Inactive)*'}`);
            originalElements.push(
                new HttpElement(
                    name,
                    ElementType.RequestCustomVariable,
                    null,
                    v,
                    new SnippetString(`{{${name}.\${1|request,response|}.\${2|headers,body|}.\${3:Header Name, *(Full Body), JSONPath or XPath}}}`)));
        }

        // add urls from history
        const historyItems = await PersistUtility.loadRequests();
        const distinctRequestUrls = Array.from(new Set(historyItems.map(item => item.url)));
        distinctRequestUrls.forEach(requestUrl => {
            const protocol = url.parse(requestUrl).protocol;
            if (!protocol) {
                return;
            }
            const prefixLength = protocol.length + 2; // https: + //
            originalElements.push(new HttpElement(`${requestUrl.substr(prefixLength)}`, ElementType.URL, '^\\s*(?:(?:GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS|CONNECT|TRACE)\\s+)https?\\:\\/{2}'));
        });

        let elements: HttpElement[] = [];
        if (line) {
            originalElements.forEach(element => {
                if (element.prefix) {
                    if (line.match(new RegExp(element.prefix, 'i'))) {
                        elements.push(element);
                    }
                }
            });
        }

        if (elements.length === 0) {
            elements = originalElements.filter(e => !e.prefix);
        } else if (elements.every(e => e.type === ElementType.FileCustomVariable || e.type === ElementType.RequestCustomVariable)) {
            elements = elements.concat(originalElements.filter(e => !e.prefix));
        } else {
            // add global/custom variables anyway
            originalElements.filter(e => !e.prefix && (e.type === ElementType.SystemVariable || e.type === ElementType.EnvironmentCustomVariable || e.type === ElementType.FileCustomVariable || e.type === ElementType.RequestCustomVariable)).forEach(element => {
                elements.push(element);
            });
        }

        return elements;
    }
}