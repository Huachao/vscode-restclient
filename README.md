# REST Client

[![Join the chat at https://gitter.im/Huachao/vscode-restclient](https://badges.gitter.im/Huachao/vscode-restclient.svg)](https://gitter.im/Huachao/vscode-restclient?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge) [![Marketplace Version](https://vsmarketplacebadge.apphb.com/version/humao.rest-client.svg)](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) [![Installs](https://vsmarketplacebadge.apphb.com/installs/humao.rest-client.svg)](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) [![Rating](https://vsmarketplacebadge.apphb.com/rating/humao.rest-client.svg)](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) [![Dependency Status](https://david-dm.org/Huachao/vscode-restclient.svg)](https://david-dm.org/Huachao/vscode-restclient)

REST Client allows you to send HTTP request and view the response in Visual Studio Code directly.

## Main Features
* Send/Cancel/Rerun __HTTP request__ in editor and view response in a separate pane with syntax highlight
* Send __CURL command__ in editor
* Auto save and view/clear request history
* Support _MULTIPLE_ requests in the same file
* View image response directly in pane
* Save raw response to local disk
* Customize font(size/family/weight) in response preview
* Environments and custom/global system variables support
    - Use custom/global variables in any place of request(_URL_, _Headers_, _Body_)
    - Auto completion and hover support for custom variables
    - Provide system dynamic variables `{{$guid}}`, `{{$randomInt min max}}` and `{{$timestamp}}` 
    - Easily create/update/delete environments and custom variables in setting file
    - Support environment switch
* Generate code snippets for __HTTP request__ in languages like `Python`, `Javascript` and more!
* Remember Cookies for subsequent requests
* Proxy support
* Send SOAP requests, as well as snippet support to build SOAP envelope easily
* `HTTP` language support
    - `.http` and `.rest` file extensions support
    - Syntax highlight (Request and Response)
    - Auto completion for method, url, header, custom/global variables and mime types
    - Comments (line starts with `#` or `//`) support
    - Support `json` and `xml` body indentation, comment shortcut and auto closing brackets
    - Code snippets for operations like `GET` and `POST`

## Usage
In editor, type a HTTP request as simple as below:
```http
https://example.com/comments/1
```
Or, you can follow the standard [RFC 2616](http://www.w3.org/Protocols/rfc2616/rfc2616-sec5.html) that including request method, headers and body.
```http
POST https://example.com/comments HTTP/1.1
content-type: application/json

{
    "name": "sample",
    "time": "Wed, 21 Oct 2015 18:27:50 GMT"
}
```
Once you prepared a request, use shortcut `Ctrl+Alt+R`(`Cmd+Alt+R` for macOS), or right click in the editor and then select `Send Request` in the menu, or press `F1` and then select/type `Rest Client: Send Request`, the response will be previewed in a separate panel of Visual Studio Code. When a request is issued, ![cloud upload](images/loading.gif) will be displayed in the status bar, after receiving the response, the icon will be changed to the duration and response size.

> All the shortcuts in REST Client Extension are __ONLY__ available for file language mode `http` and `plaintext`.

### Select Request Text
You may even want to save numerous requests in the same file and execute any of them as you wish easily. REST Client extension could recognize any line begins with three or more consecutive `#` as a delimiter between requests. Place the cursor anywhere between the delimiters, issuing the request as above, and it will first parse the text between the delimiters as request and then send it out.
```http
GET https://example.com/comments/1 HTTP/1.1

###

GET https://example.com/topics/1 HTTP/1.1

###

POST https://example.com/comments HTTP/1.1
content-type: application/json

{
    "name": "sample",
    "time": "Wed, 21 Oct 2015 18:27:50 GMT"
}
```
`REST Client Extension` also provides another flexibility that you can use mouse to highlight the text in file as request text.

## Install
Press `F1`, type `ext install rest-client`.

## Making Request
![rest-client](images/usage.gif)
### Request Line
The first non-empty line of the selection (or document if nothing is selected) is the _Request Line_.
Below are some examples of _Request Line_:
```http
GET https://example.com/comments/1 HTTP/1.1
```
```http
GET https://example.com/comments/1
```
```http
https://example.com/comments/1
```
If request method is omitted, request will be treated as __GET__, so above requests are the same after parsing.

#### Query Strings
You can always write query strings in the request line, like:
```http
GET https://example.com/comments?page=2&pageSize=10
```
Sometimes there may be several query parameters in a single request, putting all the query parameters in _Request Line_ is difficult to read and modify. So we allow you to spread query parameters into multiple lines(one line one query parameter), we will parse the lines in immediately after the _Request Line_ which starts with `?` and `&`, like
```http
GET https://example.com/comments
    ?page=2
    &pageSize=10
```

### Request Headers
The lines immediately after the _request line_ to first empty line are parsed as _Request Headers_. Please provide headers with the standard `field-name: field-value` format, each line represents one header. By default `REST Client Extension` will add a `User-Agent` header with value `vscode-restclient` in your request if you don't explicitly specify. You can also change the default value in setting `rest-client.defaultuseragent`.
Below are examples of _Request Headers_:
```http
User-Agent: rest-client
Accept-Language: en-GB,en-US;q=0.8,en;q=0.6,zh-CN;q=0.4
Content-Type: application/json
```

### Request Body
If you want to provide the request body, please add a blank line after the request headers like the POST example in usage, and all content after it will be treated as _Request Body_.
Below are examples of _Request Body_:

```http
POST https://example.com/comments HTTP/1.1
Content-Type: application/xml
Authorization: token xxx

<request>
    <name>sample</name>
    <time>Wed, 21 Oct 2015 18:27:50 GMT</time>
</request>
```

You can also specify file path to use as a body, which starts with `< `, the file path can be either in absolute or relative(relative to current http file) formats:
```http
POST https://example.com/comments HTTP/1.1
content-type: application/xml
authorization: token xxx

< C:\Users\Default\Desktop\demo.xml
```
```http
POST https://example.com/comments HTTP/1.1
content-type: application/xml
authorization: token xxx

< ./demo.xml
```

### Cancel Request
Once you want to cancel a processing request, use shortcut `Ctrl+Alt+Q`(`Cmd+Alt+Q` for macOS), or press `F1` and then select/type `Rest Client: Cancel Request`.

### Rerun Last Request
Sometimes you may want to refresh the API response, now you could do it simply using shortcut `Ctrl+Alt+L`(`Cmd+Alt+L` for macOS), or press `F1` and then select/type `Rest Client: Rerun Last Request` to rerun last request.

## Making CURL Request
![CURL Request](images/curl-request.png)
We add the capability to directly run [curl request](https://curl.haxx.se/) in REST Client extension. The issuing request command is the same as raw HTTP one. REST Client will automatically parse the request with specified parser.

## Request History
![request-history](images/request-history.png)
Each time we sent a http request, the request details(method, url, headers and body) would be persisted into file. By using shortcut `Ctrl+Alt+H`(`Cmd+Alt+H` for macOS), or press `F1` and then select/type `Rest Client: Request History`, you can view the last __50__ request items(method, url and request time) in the time reversing order, you can select any request you wish to trigger again. After specified request history item is selected, the request details would be displayed in a temp file, you can view the request details or follow previous step to trigger the request again.

You can also clear request history by pressing `F1` and then selecting/typing `Rest Client: Clear Request History`.

## Save Response
![Save Response](images/response.gif)
In the upper right corner of the response preview tab, we add a new icon to save the latest response to local file system. After you click the `Save Response` icon, it will prompt the window with the saved response file path. You can click the `Open` button to open the saved response file in current workspace, or click `Copy Path` to copy the saved response path to clipboard.

## Generate Code Snippet
![Generate Code Snippet](images/code-snippet.gif)
Once you’ve finalized your request in REST Client extension, you might want to make the same request from your own source code. We allow you to generate snippets of code in various languages and libraries that will help you achieve this. Once you prepared a request as previously, use shortcut `Ctrl+Alt+C`(`Cmd+Alt+C` for macOS), or right click in the editor and then select `Generate Code Snippet` in the menu, or press `F1` and then select/type `Rest Client: Generate Code Snippet`, it will pop up the language pick list, as well as library list. After you selected the code snippet language/library you want, the generated code snippet will be previewed in a separate panel of Visual Studio Code, you can click the `Copy Code Snippet` icon in the tab title to copy it to clipboard.

## HTTP Language
Add language support for HTTP request, with features like __syntax highlight__, __auto completion__ and __comment support__, when writing HTTP request in Visual Studio Code. By default, the language association will be automatically activated in two cases:

1. File with extension `.http` or `.rest`
2. First line of file follows standard request line in [RFC 2616](http://www.w3.org/Protocols/rfc2616/rfc2616-sec5.html), with `Method SP Request-URI SP HTTP-Version` format

If you want to enable language association in other cases, just change the language mode in the right bottom of `Visual Studio Code` to `HTTP`.

![HTTP Language](images/http.png)
### Auto Completion
Currently auto completion will be enabled for following five categories:

1. HTTP Method
2. HTTP URL from request history
3. HTTP Header
4. Global dynamic variables
5. Custom variables in current environment
6. MIME Types for `Accept` and `Content-Type` headers

## Environments and Variables
Environments give you the ability to customize requests using variables, and you can easily switch environment without chaning requests in `http` file. A common usage is having different configurations for different product environments, like devbox, sandbox and production.

Environments and variables of `REST Client Extension` are defined in setting file of `Visual Studio Code`, so you can create/update/delete environments and variables at any time you wish. The changes will take effect right away. If you __DO NOT__ want to use any environment, you can choose `No Environment` in the environments list. We also support two types of variables: __Global System Variables__ and __Environment Custom Variables__. You can use them in the same way: `{{VariableName}}`. Below is a sample piece of setting file for custom environments and variables:
```json
"rest-client.environmentVariables": {
        "local": {
            "host": "localhost",
            "token": "test token"
        },
        "production":
            "host": "example.com",
            "token": "product token"
        }
    }
```
A sample usage in `http` file for above custom variables is listed below:
```http
GET https://{{host}}/api/comments/1 HTTP/1.1
Authorization: {{token}}
```

### Custom Variables
Custom variables belong to the environment scope. Each environment is a set of key value pairs defined in setting file, key is the variable name, while value is variable value. Only custom variables in selected environment are available to you. Current active environment name is displayed in the right bottom of `Visual Studio Code`, when you click it, you can switch environment, current active environment's name will be marked with a check sign in the end. And you can also switch environment using shortcut `Ctrl+Alt+E`(`Cmd+Alt+E` for macOS), or press `F1` and then select/type `Rest Client: Switch Environment`. When you write custom variables in `http` file, auto completion will be available to you, so if you have a variable named `host`, you don't need to type the full word `{{host}}` by yourself, simply type `host` or even less characters, it will prompt you the `host` variable as well as its actual value. After you select it, the value will be autocompleted with `{{host}}`. And if you hover on it, its value will also be displayed.

### Global Variables
Global variables provide a pre-defined set of variables that can be used in every part of the request(Url/Headers/Body) in the format `{{variableName}}`. Currently, we provide a few dynamic variables which you can use in your requests. The variable names are _case-sensitive_.
* `{{$guid}}`: Add a RFC 4122 v4 UUID
* `{{$randomInt min max}}`: Returns a random integer between min (included) and max (excluded)
* `{{$timestamp}}`: Add UTC timestamp of now. You can even specify any date time based on current time in the format `{{$timestamp number option}}`, e.g., to represent 3 hours ago, simply `{{$timestamp -3 h}}`; to represent the day after tomorrow, simply `{{$timestamp 2 d}}`. The option string you can specify in timestamp are:
```
    +---------+--------------+
    | Options | Descriptions |
    +---------+--------------+
    |    y    |    Years     |
    +---------+--------------+
    |    Q    |   Quarters   |
    +---------+--------------+
    |    M    |    Months    |
    +---------+--------------+
    |    w    |    Weeks     |
    +---------+--------------+
    |    d    |     Days     |
    +---------+--------------+
    |    h    |    Hours     |
    +---------+--------------+
    |    m    |   Minutes    |
    +---------+--------------+
    |    s    |   Seconds    |
    +---------+--------------+
    |    ms   | Milliseconds |
    +---------+--------------+
```

### Variables Sample:
```http
POST https://{{host}}/comments HTTP/1.1
Content-Type: application/xml
X-Request-Id: {{token}}

{
    "request_id" "{{$guid}}"
    "updated_at": "{{$timestamp}}",
    "created_at": "{{$timestamp -1 d}}",
    "review_count": "{{$randomInt 5, 200}}"
}
```

## Customize Response Preview
REST Client Extension adds the ability to control the font family, size and weight used in the response preview.

## Settings
* `rest-client.followredirect`: Follow HTTP 3xx responses as redirects. (Default is __true__)
* `rest-client.defaultuseragent`: If User-Agent header is omitted in request header, this value will be added as user agent for each request. (Default is __vscode-restclient__)
* `rest-client.timeoutinmilliseconds`: Timeout in milliseconds. 0 for infinity. (Default is __0__)
* `rest-client.showResponseInDifferentTab`: Show response in different tab. (Default is __false__)
* `rest-client.rememberCookiesForSubsequentRequests`: Save cookies from `Set-Cookie` header in response and use for subsequent requests. (Default is __true__)
* `rest-client.enableTelemetry`: Send out anonymous usage data. (Default is __true__)
* `rest-client.excludeHostsForProxy`: Excluded hosts when using proxy settings. (Default is __[]__)
* `rest-client.fontSize`: Controls the font size in pixels used in the response preview. (Default is __13__)
* `rest-client.fontFamily`: Controls the font family used in the response preview. (Default is __Menlo, Monaco, Consolas, "Droid Sans Mono", "Courier New", monospace, "Droid Sans Fallback"__)
* `rest-client.fontWeight`: Controls the font weight used in the response preview. (Default is __normal__)
* `rest-client.environmentVariables`: Sets the environments and custom variables belongs to it (e.g., `{"production": {"host": "api.example.com"}, "sandbox":{"host":"sandbox.api.example.com"}}`). (Default is __{}__)

Rest Client respects the proxy settings made for Visual Studio Code (`http.proxy` and `http.proxyStrictSSL`).

## License
[MIT License](LICENSE)

## Change Log
See CHANGELOG [here](CHANGELOG.md)

## Feedback
Please provide feedback through the [GitHub Issue](https://github.com/Huachao/vscode-restclient/issues) system, or fork the repository and submit PR.
