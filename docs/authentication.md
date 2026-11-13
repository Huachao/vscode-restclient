---
title: Authentication
description: Configuration and usage of authentication methods in REST Client CE.
---

REST Client CE supports various authentication schemes to secure your API requests.

## Basic Auth

HTTP Basic Auth uses a username and password. Three formats are supported:

1. Raw `username:password`
2. Base64-encoded `username:password`
3. `username` and `password` separated by space (auto-encoded)

These are equivalent:

```http
GET https://httpbin.org/basic-auth/user/passwd HTTP/1.1
Authorization: Basic user:passwd
```

```http
GET https://httpbin.org/basic-auth/user/passwd HTTP/1.1
Authorization: Basic dXNlcjpwYXNzd2Q=
```

```http
GET https://httpbin.org/basic-auth/user/passwd HTTP/1.1
Authorization: Basic user passwd
```

## Digest Auth

Similar to Basic Auth but more secure challenge-response:
Format supported: `username` and `password` separated by space (auto-encoded)

```http
GET https://httpbin.org/digest-auth/auth/user/passwd
Authorization: Digest user passwd
```

## SSL Client Certificates

Supports `PFX`, `PKCS12`, and `PEM` certificates. Configure in settings:

### PEM Format

```json
"rest-client.certificates": {
    "localhost:8081": {
        "cert": "/path/to/client.crt",
        "key": "/path/to/client.key"
    },
    "example.com": {
        "cert": "/path/to/client.crt",
        "key": "/path/to/client.key"
    }
}
```

### PFX/PKCS12 Format

```json
"rest-client.certificates": {
    "localhost:8081": {
        "pfx": "/path/to/clientcert.p12",
        "passphrase": "123456"
    }
}
```

Paths can be absolute or relative to workspace/current file.

## Microsoft Entra ID (Azure Active Directory)

Only support V2, V1 is deprecated and end of life since 2023.

Use the `{% raw %}{{$aadV2Token}}{% endraw %}` system variable:

```http
GET https://graph.microsoft.com/v1.0/me
Authorization: Bearer {% raw %}{{$aadV2Token}}{% endraw %}
```

Optional parameters:

{% raw %}

```
{{$aadV2Token [new] [AzureCloud|AzureChinaCloud|AzureUSGovernment|ppe] [appOnly] [scopes:<scope>] [tenantid:<domain|tenantId>] [clientid:<clientId>}}
```

{% endraw %}

- `new` - Force re-authentication
- Cloud specification - Default: `AzureCloud`
- `appOnly` - Use client credentials flow (requires `aadV2ClientSecret` and `aadV2AppUri` environment variables)
- `scopes:` - Comma-delimited scopes
- `tenantid:` - Tenant domain or ID (`common` for sign-in determination)
- `clientid:` - App registration ID (defaults to plugin's built-in app)

## OpenID Connect (OIDC)

Create a Access Token from Open ID Connect end point as Microsft Identity Platform:

{% raw %}

```http
{{$oidcAccessToken [new] [<clientId:<clientId>] [<callbackPort:<callbackPort>] [authorizeEndpoint:<authorizeEndpoint>] [tokenEndpoint:<tokenEndpoint>] [scopes:<scopes>] [audience:<audience>}}
```

{% endraw %}

## AWS Signature v4

Set Authorization header with `AWS` scheme:

```http
GET https://httpbin.org/aws-auth HTTP/1.1
Authorization: AWS <accessId> <accessKey> [token:<sessionToken>] [region:<regionName>] [service:<serviceName>]
```

Parameters (space-separated):

- `<accessId>` - AWS Access Key ID (required)
- `<accessKey>` - AWS Secret Access Key (required)
- `token:<sessionToken>` - Session token for temporary credentials (optional)
- `region:<regionName>` - AWS region (optional if deducible from URL)
- `service:<serviceName>` - AWS service name (optional if deducible from URL)

## AWS Cognito

Authenticate via AWS Cognito user pool:

```http
GET https://httpbin.org/aws-auth HTTP/1.1
Authorization: COGNITO <Username> <Password> <Region> <UserPoolId> <ClientId>
```

Parameters (space-separated):

- `<Username>` - AWS username
- `<Password>` - AWS password
- `<Region>` - AWS region for Cognito pool
- `<UserPoolId>` - Cognito User Pool ID
- `<ClientId>` - Cognito Client ID

## Using Authentication with Variables

Combine authentication with environment variables for security:

```json
"rest-client.environmentVariables": {
    "$shared": {},
    "production": {
        "awsAccessKey": "AKIAIOSFODNN7EXAMPLE",
        "awsSecretKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
    }
}
```

```http
GET https://dynamodb.us-east-1.amazonaws.com/
Authorization: AWS {{awsAccessKey}} {{awsSecretKey}} region:us-east-1 service:dynamodb
```

> **Security Note:** Be cautious with sensitive credentials. Use environment variables or system variables like `{% raw %}{{$processEnv VAR_NAME}}{% endraw %}` to avoid committing secrets to source control.
