import Logger from "../../../logger";
import { ApiKeyAuth, Authorization, AWSAuth, BasicAuth, BearerAuth, DigestAuth } from "../../../models/auth/authorization";

export class PostmanAuthorizationParser {
    static parse(auth: PostmanAuthorization): Authorization | undefined {
        if (!auth) {
            return;
        }

        let username: string | undefined = '', passwd: string | undefined = '';

        switch (auth.type) {
            case PostmanAuthorizationType.ApiKey:
                const value = auth.apikey?.find(w => w.key === 'value')?.value;
                if (!value) {
                    return;
                }
                return new ApiKeyAuth(value);
                break;
            case PostmanAuthorizationType.Basic:
                username = auth.basic?.find(w => w.key === 'username')?.value;
                passwd = auth.basic?.find(w => w.key === 'password')?.value;
                if (!username || !passwd) {
                    return;
                }
                return BasicAuth.fromUserPass(username, passwd);
            case PostmanAuthorizationType.Digest:
                username = auth.digest?.find(w => w.key === 'username')?.value;
                passwd = auth.digest?.find(w => w.key === 'password')?.value;
                if (!username || !passwd) {
                    return;
                }
                return DigestAuth.fromUserPass(username, passwd);
            case PostmanAuthorizationType.AWS:
                const accessId = auth.awsv4?.find(w => w.key === 'secretKey')?.value;
                const accessKey = auth.awsv4?.find(w => w.key === 'accessKey')?.value;
                const regionName = auth.awsv4?.find(w => w.key === 'region')?.value;
                const serviceName = auth.awsv4?.find(w => w.key === 'service')?.value;
                const sessionToken = auth.awsv4?.find(w => w.key === 'sessionToken')?.value;
                if (!accessId || !accessKey || !regionName || !serviceName || !sessionToken) {
                    return;
                }

                return AWSAuth.fromDetails({
                    accessId,
                    accessKey,
                    regionName,
                    serviceName,
                    sessionToken
                });
            case PostmanAuthorizationType.BearerToken:
                const token = auth.bearer?.find(w => w.key === 'token')?.value;
                if (token == null) {
                    return;
                }
                return new BearerAuth(<string>token);
            default:
                Logger.warn(`Authorization with type '${auth.type}' could not be parsed for the requests.`);
                return;
        }
        return;
    }
}

export class PostmanAuthorization {
    type: string;
    digest: Array<{ key: string, value: string }> | undefined;
    bearer: Array<{ key: string, value: string }> | undefined;
    basic: Array<{ key: string, value: string }> | undefined;
    apikey: Array<{ key: string, value: string }> | undefined;
    awsv4: Array<{ key: string, value: string }> | undefined;
}


enum PostmanAuthorizationType {
    ApiKey = "apikey",
    Basic = "basic",
    Digest = "digest",
    BearerToken = "bearer",
    AWS = "awsv4"
}