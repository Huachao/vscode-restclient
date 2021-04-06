import * as http from 'http';

// supported subset of the TLS options => https://nodejs.org/api/tls.html#tls_tls_createsecurecontext_options
export type HttpsOptions = {
    cert?: string;
    key?: string;
    ca?: string;
    pfx?: string;
    passphrase?: string;
};

export type ResponseHeaders = http.IncomingHttpHeaders;

export type ResponseHeaderValue = { [K in keyof ResponseHeaders]: ResponseHeaders[K] }[keyof ResponseHeaders];

export type RequestHeaders = http.OutgoingHttpHeaders;

export type RequestHeaderValue = { [K in keyof RequestHeaders]: RequestHeaders[K] }[keyof RequestHeaders];