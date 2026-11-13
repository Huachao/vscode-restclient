---
title: Metadata Directives
description: Comprehensive guide to metadata directives (@commands) in REST Client CE - control request behavior with @name, @prompt, @set, and more.
---

Metadata directives are special `@` commands placed in comments before a request to control its behavior, extract data, or provide additional context. These directives enhance your HTTP requests with powerful features like request chaining, interactive input, and response extraction.

## Supported Metadata Directives

| Directive        | Description                                        |
| ---------------- | -------------------------------------------------- |
| `@name`          | Assign a name to the request for cross-referencing |
| `@prompt`        | Prompt for user input before sending               |
| `@set`           | Extract response values to variables               |
| `@note`          | Show confirmation dialog before sending            |
| `@no-redirect`   | Disable automatic following of redirects           |
| `@no-cookie-jar` | Disable cookie jar for this request                |

## Syntax

Metadata directives are placed in comment lines (`#` or `//`) **before** the request URL:

```http
# @name myRequest
# @prompt apiKey
# @note This will delete data
POST https://api.example.com/delete HTTP/1.1
Authorization: Bearer {{apiKey}}
```

Multiple directives can be used on the same request by adding multiple comment lines.

## @name

Assign a name to a request for later reference. Named requests can be referenced in variable definitions to extract data from their responses via [request variables]({{ '/variables#request-variables' | relative_url }}).

For quickly navigating to named requests, use `Ctrl+Shift+O` (`Cmd+Shift+O` on macOS).

### Usage

```http
# @name login
POST https://api.example.com/login HTTP/1.1
Content-Type: application/json

{
    "username": "user",
    "password": "pass"
}
```

### Naming Rules

- Use alphanumeric characters and underscores
- Case-sensitive
- Should be unique within the file for clear referencing
- Descriptive names help: `@loginUser`, `@getUserProfile`, `@createComment`

> For detailed documentation on request chaining, variable extraction, and advanced use cases, see [Request Variables]({{ '/variables#request-variables' | relative_url }}).

## @prompt

Prompt for user input when the request is sent. Perfect for one-time values like OTPs, temporary codes, or dynamic data that changes per execution.

### Syntax

```http
# @prompt <variable> <description>
```

- `variable`: Name of the variable to set
- `description`: Optional placeholder text shown in the input dialog

If the variable name contains `password`, `passwd`, or `pass` (case-insensitive), the input is masked.

### Usage

```http
# @prompt apiKey
GET https://api.example.com/data HTTP/1.1
Authorization: Bearer {{apiKey}}

# @prompt username Your username
# @prompt password Your password
POST https://api.example.com/login HTTP/1.1
Authorization: Basic {{username}}:{{password}}
```

### Behavior

- Values are **not stored**; you're prompted every time
- Prompt variables override any pre-defined variables
- Canceling the prompt skips the request

> For comprehensive documentation on prompt variables, including multiple prompts and best practices, see [Prompt Variables]({{ '/variables#prompt-variables' | relative_url }}).

## @set

Extract specific values from a request's response and store them in variables for reuse. This enables powerful request chaining where data from one response feeds into subsequent requests.

### Syntax

```http
# @set <targetName> = <response.headers.*|response.body.*>
```

- `targetName`: Name of the variable to create (alphanumeric, underscores)
- `sourcePath`: Path to the response value using dot notation

### Usage

```http
# @set userId = response.body.user.id
GET https://api.example.com/profile HTTP/1.1
Authorization: Bearer {{authToken}}
```

Variable `userId` would be set for all `.http` files.

To avoid accidental variable creation from typos, `@set` targets must be predeclared in the `$shared` environment:

```json
"rest-client.environmentVariables": {
    "$shared": {
        "authToken": "",
        "userId": ""
    }
}
```

Or use file variable definitions:

```http
@authToken =
@userId =
```

### Examples

#### Extracting Body Values

```http
# @name login
POST https://api.example.com/login HTTP/1.1
Content-Type: application/json

{
    "username": "user",
    "password": "pass"
}

###

# @set authToken = response.body.token
# @set userId = response.body.user.id
GET https://api.example.com/profile HTTP/1.1
Authorization: Bearer {{authToken}}

###

POST https://api.example.com/posts
Authorization: Bearer {{authToken}}
Content-Type: application/json

{
    "userId": {{userId}},
    "content": "Hello!"
}
```

#### Extracting Headers

```http
{% raw %}# @name login
POST https://api.example.com/login HTTP/1.1

###
# @set authToken = response.headers.x-auth-token
GET https://api.example.com/data HTTP/1.1
Authorization: Bearer {{authToken}}{% endraw %}
```

Header names are case-insensitive.

#### JSONPath for Nested Objects

For complex JSON responses, use JSONPath syntax:

```http
{% raw %}# @name searchUsers
GET https://api.example.com/users?q=john

###
# @set firstUserId = response.body.$.users[0].id
# @set totalCount = response.body.$.total
DELETE https://api.example.com/users/{{firstUserId}}{% endraw %}
```

The `$` represents the root of the response body.

### Important Notes

- The source request (the one that provides the response) **must have been executed first** before `@set` can extract its data
- If the path doesn't exist or the source request hasn't been executed, a diagnostic error appears
- Variable names must be pre-declared in the `$shared` environment or the `@set` will be ignored (to prevent typos creating unwanted variables)

## @note

Display a confirmation dialog before sending the request. This safety feature prevents accidental execution of critical operations like deletes or mutations.

### Usage

```http
# @note This will permanently delete all users!
DELETE https://api.example.com/users HTTP/1.1
```

When you send this request, a dialog appears showing the note. You must confirm to proceed.

When to Use:

- **DELETE** requests that remove data
- **POST/PUT** that create or modify important data
- Requests that incur costs (payments, resource creation)
- Operations that cannot be easily undone

### Examples

```http
# @note This will charge $99.99 to the default payment method
POST https://api.example.com/billing/subscribe HTTP/1.1
Content-Type: application/json

{
    "plan": "premium",
    "autoRenew": true
}

###

# @note This action cannot be undone. All associated data will be deleted.
DELETE https://api.example.com/account
```

## @no-redirect

By default, REST Client follows HTTP redirects (3xx status codes). Use `@no-redirect` to prevent automatic redirection and handle redirects manually.

### Usage

```http
# @no-redirect
GET https://api.example.com/old-endpoint HTTP/1.1
```

The response will show the 3xx status code and `Location` header without automatically following the redirect.

### When to Use

- Debugging redirect chains
- Manually handling OAuth flows that use redirects
- Preserving original request context
- Testing redirect behavior

## @no-cookie-jar

By default, REST Client maintains a cookie jar per file to persist cookies across requests. Use `@no-cookie-jar` to disable cookie handling for a specific request.

### Usage

```http
# @no-cookie-jar
GET https://api.example.com/public-data HTTP/1.1
```

### When to Use

- Requests that should not send or store cookies
- Testing stateless endpoints
- Privacy-sensitive requests where cookies should be avoided
- Debugging cookie-related issues

## Combining Multiple Directives

You can combine multiple directives on a single request:

```http
{% raw %}# @name createUser
# @prompt userName
# @note This will create a new user account
# @no-cookie-jar
POST https://api.example.com/users HTTP/1.1
Content-Type: application/json

{
    "name": "{{userName}}",
    "email": "{{$faker internet.email}}"
}

###

# @set userId = response.body.id
# @set userToken = response.headers.x-auth-token{% endraw %}
```

Directives are processed in this order:

1. `@note` (confirmation first)
2. `@prompt` (input collection)
3. `@no-redirect` / `@no-cookie-jar` (behavior modifiers)
4. Request execution
5. `@set` (variable extraction after response)

## Troubleshooting

### Metadata not recognized?

- Ensure directives are in comment lines (`#` or `//`)
- Place directives **before** the request URL, not after
- All directive comments must be consecutive (no blank lines between them and the request)

### @set variable not being set

- The source request (referenced in the `@set`) must be executed **before** the request containing `@set`
- Check that the JSONPath or header name is correct
- Ensure the `@set` target variable is predeclared in `$shared` or as a file variable
- Hover over the variable reference to see diagnostic messages

### @prompt not showing?

- Check that `@prompt` is in a comment line before the request
- Ensure there are no syntax errors in the directive (variable name required)
- The request must be sent directly (not as part of "Send All")

### @note confirmation not appearing?

- Some VS Code settings may suppress dialogs; check `window.openDialogs`
- If running background tasks, ensure UI dialogs are allowed

## Best Practices

1. **Pre-declare `@set` targets** - Define variables in `$shared` or as file variables to catch typos
2. **Use descriptive names** - `@loginUser` beats `@req1` for clarity and goto symbol
3. **Combine with request chaining** - `@name` + `@set` creates powerful workflows
4. **Prompt for sensitive data** - Use `@prompt password` instead of hardcoding secrets
5. **Confirm destructive operations** - Always use `@note` for DELETE/POST that modify data
6. **One directive per line** - Keep them readable: `# @name foo`, `# @prompt bar`, not `# @name foo @prompt bar`
7. **Order matters** - Place all metadata before the request; once the request line appears, metadata parsing stops
