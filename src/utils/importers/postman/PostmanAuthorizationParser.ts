import Logger from "../../../logger";
import { Authorization, BearerAuth, AWSAuth } from "../../../models/auth/authorization";

export class PostmanAuthorizationParser {
    static parse(auth: PostmanAuthorization): Authorization | undefined {
        if (!auth) {
            return;
        }

        switch (auth.type) {
            case PostmanAuthorizationType.ApiKey:
                break;
            case PostmanAuthorizationType.Basic:
                break;
            case PostmanAuthorizationType.Digest:
                break;
            case PostmanAuthorizationType.AWS:
                //TODO: finish this
                const accessId = auth.awsv4?.find(w => w.key === '');
                const accessKey = '';
                const regionName = '';
                const serviceName = '';
                const sessionToken = '';
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