import * as url from 'url';
import { md5 } from '../misc';

import got = require('got');

const uuidv4 = require('uuid/v4');

export function digest(user: string, pass: string): got.AfterResponseHook {
    return (response, retryWithMergedOptions) => {
        if (response.statusCode === 401
            && response.headers['www-authenticate']
            && response.headers['www-authenticate'].split(' ')[0].toLowerCase() === 'digest') {
            const authHeader = response.headers['www-authenticate'];
            const method = (response as any).request.options.method;
            const path = url.parse(response.url).path;
            const challenge = {
                qop: '',
                algorithm: '',
                realm: '',
                nonce: '',
                opaque: ''
            };
            const re = /([a-z0-9_-]+)=(?:"([^"]+)"|([a-z0-9_-]+))/gi;

            /* Copy from https://github.com/request/request/blob/master/lib/auth.js */
            while (true) {
                const match = re.exec(authHeader);
                if (!match) {
                    break;
                }
                challenge[match[1]] = match[2] || match[3];
            }

            const ha1Compute = function (algorithm, user, realm, pass, nonce, cnonce) {
                const ha1 = md5(user + ':' + realm + ':' + pass);
                if (algorithm?.toLowerCase() === 'md5-sess') {
                    return md5(ha1 + ':' + nonce + ':' + cnonce);
                } else {
                    return ha1;
                }
            };

            const qop = /(^|,)\s*auth\s*($|,)/.test(challenge.qop) && 'auth';
            const nc = qop && '00000001';
            const cnonce = qop && uuidv4().replace(/-/g, '');
            const ha1 = ha1Compute(challenge.algorithm, user, challenge.realm, pass, challenge.nonce, cnonce);
            const ha2 = md5(method + ':' + path);
            const digestResponse = qop
                ? md5(ha1 + ':' + challenge.nonce + ':' + nc + ':' + cnonce + ':' + qop + ':' + ha2)
                : md5(ha1 + ':' + challenge.nonce + ':' + ha2);
            const authValues = {
                username: user,
                realm: challenge.realm,
                nonce: challenge.nonce,
                uri: path,
                qop: qop,
                response: digestResponse,
                nc: nc,
                cnonce: cnonce,
                algorithm: challenge.algorithm,
                opaque: challenge.opaque
            };

            const authParams: string[] = [];
            for (const [key, value] of Object.entries(authValues)) {
                if (authValues[key]) {
                    if (key === 'qop' || key === 'nc' || key === 'algorithm') {
                        authParams.push(key + '=' + value);
                    } else {
                        authParams.push(key + '="' + value + '"');
                    }
                }
            }
            const updatedOptions = {
                headers: {
                    authorization: 'Digest ' + authParams.join(', ')
                }
            };
            return retryWithMergedOptions(updatedOptions);
        }

        return response;
    };
}