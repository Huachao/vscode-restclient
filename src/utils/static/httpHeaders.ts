import { ElementType, HttpElement } from '../../models/httpElement';

/**
 * HTTP standard methods
 */
export const HTTP_METHODS: HttpElement[] = [
    new HttpElement('GET', ElementType.Method),
    new HttpElement('POST', ElementType.Method),
    new HttpElement('PUT', ElementType.Method),
    new HttpElement('DELETE', ElementType.Method),
    new HttpElement('PATCH', ElementType.Method),
    new HttpElement('HEAD', ElementType.Method),
    new HttpElement('OPTIONS', ElementType.Method),
    new HttpElement('TRACE', ElementType.Method),
    new HttpElement('CONNECT', ElementType.Method),
    // QUERY: a safe, idempotent method WITH a body (draft-ietf-httpbis-safe-method-w-body)
    new HttpElement('QUERY', ElementType.Method),

];

/**
 * HTTP standard headers
 */
export const HTTP_HEADERS: HttpElement[] = [
    new HttpElement(
        'Accept',
        ElementType.Header,
        null,
        'Specify certain media types which are acceptable for the response'
    ),
    new HttpElement(
        'Accept-Charset',
        ElementType.Header,
        null,
        'Indicate what character sets are acceptable for the response'
    ),
    new HttpElement(
        'Accept-Encoding',
        ElementType.Header,
        null,
        'Indicate the content-codings that are acceptable in the response'
    ),
    new HttpElement(
        'Accept-Language',
        ElementType.Header,
        null,
        'Indicate the set of natural languages that are preferred as a response to the request'
    ),
    new HttpElement(
        'Accept-Datetime',
        ElementType.Header,
        null,
        'Indicate it wants to access a past state of an original resource'
    ),
    new HttpElement(
        'Authorization',
        ElementType.Header,
        null,
        'Consists of credentials containing the authentication information of the user agent for the realm of the resource being requested'
    ),
    new HttpElement(
        'Cache-Control',
        ElementType.Header,
        null,
        'Specify directives that MUST be obeyed by all caching mechanisms along the request/response chain'
    ),
    new HttpElement(
        'Connection',
        ElementType.Header,
        null,
        'Specify options that are desired for that particular connection and MUST NOT be communicated by proxies over further connections'
    ),
    new HttpElement(
        'Content-Length',
        ElementType.Header,
        null,
        'Indicate the size of the entity-body'
    ),
    new HttpElement(
        'Content-MD5',
        ElementType.Header,
        null,
        'Provide an end-to-end message integrity check of the entity-body'
    ),
    new HttpElement(
        'Content-Type',
        ElementType.Header,
        null,
        'Indicate the media type of the entity-body sent to the recipient or, in the case of the HEAD method, the media type that would have been sent had the request been a GET'
    ),
    new HttpElement(
        'Cookie',
        ElementType.Header,
        null,
        'An HTTP cookie previously sent by the server with Set-Cookie'
    ),
    new HttpElement(
        'Date',
        ElementType.Header,
        null,
        'Represent the date and time at which the message was originated'
    ),
    new HttpElement(
        'Expect',
        ElementType.Header,
        null,
        'Indicate that particular server behaviors are required by the client'
    ),
    new HttpElement(
        'Forwarded',
        ElementType.Header,
        null,
        'Disclose original information of a client connecting to a web server through an HTTP proxy'
    ),
    new HttpElement(
        'From',
        ElementType.Header,
        null,
        'The email address of the user making the request'
    ),
    new HttpElement(
        'Host',
        ElementType.Header,
        null,
        'Specify the Internet host and port number of the resource being requested'
    ),
    new HttpElement(
        'If-Match',
        ElementType.Header,
        null,
        'Only perform the action if the client supplied entity matches the same entity on the server. This is mainly for methods like PUT to only update a resource if it has not been modified since the user last updated it'
    ),
    new HttpElement(
        'If-Modified-Since',
        ElementType.Header,
        null,
        'Allows a 304 Not Modified to be returned if content is unchanged since the time specified in this field'
    ),
    new HttpElement(
        'If-None-Match',
        ElementType.Header,
        null,
        'Allows a 304 Not Modified to be returned if content is unchanged for ETag'
    ),
    new HttpElement(
        'If-Range',
        ElementType.Header,
        null,
        'If the entity is unchanged, send me the part(s) that I am missing; otherwise, send me the entire new entity.'
    ),
    new HttpElement(
        'If-Unmodified-Since',
        ElementType.Header,
        null,
        'Only send the response if the entity has not been modified since a specific time'
    ),
    new HttpElement(
        'Max-Forwards',
        ElementType.Header,
        null,
        'Provide a mechanism with the TRACE and OPTIONS methods to limit the number of proxies or gateways that can forward the request to the next inbound server'
    ),
    new HttpElement(
        'Origin',
        ElementType.Header,
        null,
        'Initiate a request for cross-origin resource sharing'
    ),
    new HttpElement(
        'Pragma',
        ElementType.Header,
        null,
        'Include implementation-specific directives that might apply to any recipient along the request/response chain'
    ),
    new HttpElement(
        'Proxy-Authorization',
        ElementType.Header,
        null,
        'Allows the client to identify itself (or its user) to a proxy which requires authentication'
    ),
    new HttpElement(
        'Range',
        ElementType.Header,
        null,
        'Request only part of an entity. Bytes are numbered from 0'
    ),
    new HttpElement(
        'Referer',
        ElementType.Header,
        null,
        "Allow the client to specify, for the server's benefit, the address (URI) of the resource from which the Request-URI was obtained"
    ),
    new HttpElement(
        'TE',
        ElementType.Header,
        null,
        'Indicate what extension transfer-codings it is willing to accept in the response and whether or not it is willing to accept trailer fields in a chunked transfer-coding'
    ),
    new HttpElement(
        'Upgrade',
        ElementType.Header,
        null,
        'Allow the client to specify what additional communication protocols it supports and would like to use if the server finds it appropriate to switch protocols'
    ),
    new HttpElement(
        'User-Agent',
        ElementType.Header,
        null,
        'Contain information about the user agent originating the request'
    ),
    new HttpElement(
        'Via',
        ElementType.Header,
        null,
        'Indicate the intermediate protocols and recipients between the user agent and the server on requests, and between the origin server and the client on responses'
    ),
    new HttpElement(
        'Warning',
        ElementType.Header,
        null,
        'Carry additional information about the status or transformation of a message which might not be reflected in the message'
    ),
    new HttpElement(
        'X-Http-Method-Override',
        ElementType.Header,
        null,
        'Requests a web application override the method specified in the request (typically POST) with the method given in the header field (typically PUT or DELETE).'
    ),
];

/**
 * MIME for specific header like Content-Type or Accept
 */
const MIME_PREFIX_REGEX = '^\\s*(Content-Type|Accept)\\s*\\:\\s*';

export const MIME_TYPES: HttpElement[] = [
    new HttpElement('application/json', ElementType.MIME, MIME_PREFIX_REGEX),
    new HttpElement('application/xml', ElementType.MIME, MIME_PREFIX_REGEX),
    new HttpElement('application/javascript', ElementType.MIME, MIME_PREFIX_REGEX),
    new HttpElement('application/xhtml+xml', ElementType.MIME, MIME_PREFIX_REGEX),
    new HttpElement('application/octet-stream', ElementType.MIME, MIME_PREFIX_REGEX),
    new HttpElement('application/soap+xml', ElementType.MIME, MIME_PREFIX_REGEX),
    new HttpElement('application/zip', ElementType.MIME, MIME_PREFIX_REGEX),
    new HttpElement('application/gzip', ElementType.MIME, MIME_PREFIX_REGEX),
    new HttpElement('application/x-www-form-urlencoded', ElementType.MIME, MIME_PREFIX_REGEX),
    new HttpElement('image/gif', ElementType.MIME, MIME_PREFIX_REGEX),
    new HttpElement('image/jpeg', ElementType.MIME, MIME_PREFIX_REGEX),
    new HttpElement('image/png', ElementType.MIME, MIME_PREFIX_REGEX),
    new HttpElement('message/http', ElementType.MIME, MIME_PREFIX_REGEX),
    new HttpElement('multipart/form-data', ElementType.MIME, MIME_PREFIX_REGEX),
    new HttpElement('text/css', ElementType.MIME, MIME_PREFIX_REGEX),
    new HttpElement('text/csv', ElementType.MIME, MIME_PREFIX_REGEX),
    new HttpElement('text/html', ElementType.MIME, MIME_PREFIX_REGEX),
    new HttpElement('text/plain', ElementType.MIME, MIME_PREFIX_REGEX),
    new HttpElement('text/xml', ElementType.MIME, MIME_PREFIX_REGEX),
];
