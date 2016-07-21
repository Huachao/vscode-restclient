# REST Client

[![Join the chat at https://gitter.im/Huachao/vscode-restclient](https://badges.gitter.im/Huachao/vscode-restclient.svg)](https://gitter.im/Huachao/vscode-restclient?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge) [![Marketplace Version](http://vsmarketplacebadge.apphb.com/version/humao.rest-client.svg)](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) [![Installs](http://vsmarketplacebadge.apphb.com/installs/humao.rest-client.svg)](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) [![Rating](http://vsmarketplacebadge.apphb.com/rating/humao.rest-client.svg)](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) [![Dependency Status](https://david-dm.org/Huachao/vscode-restclient.svg)](https://david-dm.org/Huachao/vscode-restclient)

REST Client allows you to send HTTP request and view the response in Visual Studio Code directly.

## Features
* Send __HTTP request__ in editor and view response in a separate pane with syntax highlight
* Send __CURL command__ in editor
* Auto save and view request history
* Code snippets for operations like `GET` and `POST`
* Add HTTP language support with _syntax highlight_
* Add HTTP language _auto completition_ for method, header, and mime types

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
Once you prepared a request, use shortcut `Ctrl+Alt+R`, or press `F1` and then select/type `Rest Client: Send Request`, the response will be previewed in seperate panel of Visual Studio Code. When a request is issued, ![cloud upload](images/cloud-upload-icon.png) will be disalyed in the status bar, when receiving the response, the icon will be changed to the duration.

## Install
Press `F1`, type `ext install rest-client`.

## Making Request
![rest-client](images/demo.gif)
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

### Request Headers
The lines immediately after the request line to first empty line are parsed as _Request Headers_. Please provide headers with the standard `field-name: field-value` format, each line represents one header.
Below are examples of _Request Headers_:
```http
user-agent: rest-client
accept-language: en-GB,en-US;q=0.8,en;q=0.6,zh-CN;q=0.4
```

### Request Body
If you want to provide the request body, please add a blank line after the request headers like the POST example in usage, and all content after it will be treated as _Request Body_.
Below are examples of _Request Body_:

```http
POST https://example.com/comments HTTP/1.1
content-type: application/xml
authorization: token xxx

<request>
    <name>sample</name>
    <time>Wed, 21 Oct 2015 18:27:50 GMT</time>
</request>
```

## Making CURL Request
![CURL Request](images/curl-request.png)
We add the capability to directly run [curl request](https://curl.haxx.se/) in REST Client extension. The making request command is the same as previous one. REST Client will automatically parse the request with specified parser.

## Request History
![request-history](images/request-history.png)
Each time we sent a http request, the request details(method, url, headers and body) would be persisted into file. By using shortcut `Ctrl+Alt+H`, or press `F1` and then select/type `Rest Client: Request History`, you can view the last __50__ request items in the time reversing order, you can select any request you wish to trigger again. After specified request history item is selected, the request details would be displayed in a temp file, you can view the request details or follow previous step to trigger the request again.

## HTTP Language
Add language support for HTTP request, with __syntax highlight__ and __autocomplete__, when writing HTTP request in Visual Studio Code. By default, the language association will be automatically activated in two cases:

1. File with extension `.http` and `.rest`
2. First line of file follows standard request line in [RFC 2616](http://www.w3.org/Protocols/rfc2616/rfc2616-sec5.html), with `Method SP Request-URI SP HTTP-Version` format

If you want to enable language association in other cases, just change the language mode to `HTTP`.

![HTTP Language](images/http.png)
Currently we will auto complete for three cases:

1. HTTP Method
2. HTTP Header
3. MIME Types for `Accept` and `Content-Type` headers

## Settings
* `rest-client.followredirect`: Follow HTTP 3xx responses as redirects. (Default is __true__)
* `rest-client.defaultuseragent`: If User-Agent header is omitted in request header, this value will be added as user agent for each request. (Default is __vscode-restclient__)
* `rest-client.timeoutinmilliseconds`: Timeout in milliseconds. 0 for infinity. (Default is __0__)

## License
[MIT License](LICENSE)

## Change Log
### 0.6.1
* Update README to reflect latest changes

### 0.6.0
* Preview response with css file which takes theme style into consideration. Fix the issue [avoid the white background](https://github.com/Huachao/vscode-restclient/issues/12) 

### 0.5.5
* Bug fix [Allow host header in request headers](https://github.com/Huachao/vscode-restclient/issues/10)
* Bug fix [Display raw response if not real json](https://github.com/Huachao/vscode-restclient/issues/14)

### 0.5.4
* Bug fix for escape string header values

### 0.5.3
* Format response of `application/xml` type
* Bug fix for escapse `<` and `>` in response headers

### 0.5.2
* Add autocompletition of MIME type for specific headers like `Content-Type` and `Accept`

### 0.5.1
* Add autocomplete for HTTP language

### 0.5.0
* Add HTTP language and syntax highlight
* Add `.http` and `.rest` file extension associations with HTTP language

### 0.4.0
* Add capability to directly run [curl request](https://curl.haxx.se/)

### 0.3.1
* Add get and post code snippet

### 0.3.0
* Display response in a separate pane with syntax highlight

### 0.2.2
* __Fix__: Getting history request items from previous versions

### 0.2.1
* __Add Configuration Setting__: Timeout in milliseconds, less or equal than 0 represents for infinity, default is `0` 

### 0.2.0
* Add http request history

### 0.1.1
* Update image in README.md

### 0.1.0
* Refactor code for rest call
* Beautify JSON response

### 0.0.6
* Allow self-signed certificate

### 0.0.5
* __Add Configuration Setting__: Follow HTTP 3xx responses as redirects, default is `TRUE`
* __Add Configuration Setting__: Add default user agent if user not specified, default value is `vscode-restclient`

### 0.0.4
* __Add Configuration Setting__: Allow clear output window before sending a new request

### 0.0.3
* Initial release!

## Feedback
Please provide feedback through the [GitHub Issue](https://github.com/Huachao/vscode-restclient/issues) system, or fork the repository and submit PR.
