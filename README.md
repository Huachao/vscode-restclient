# REST Client
[![Dependency Status](https://david-dm.org/Huachao/vscode-restclient.svg)](https://david-dm.org/Huachao/vscode-restclient)

REST Client allows you to send HTTP request and view the response in Visual Studio Code directly.

## Usage
In editor, type a HTTP request as simple as below:
```
https://example.com/comments/1
```
Or, you can follow the standard [RFC 2616](http://www.w3.org/Protocols/rfc2616/rfc2616-sec5.html) that including request method, headers and body.
```
POST https://example.com/comments HTTP/1.1
content-type: application/json

{
    "name": "sample",
    "time": "Wed, 21 Oct 2015 18:27:50 GMT"
}
```
Once you prepared a request, use shortcut `Ctrl+Alt+R`, or press `F1` and then select/type `Rest Client: Send Request`, the response will be displayed in the output window at the bottom of Visual Studio Code.

## Install
Press `F1`, type `ext install rest-client`.

## Making Request
![rest-client](images/rest-client.png)
### Request Line
The first non-empty line of the selection (or document if nothing is selected) is the _Request Line_.
Below are some examples of _Request Line_:
```
GET https://example.com/comments/1 HTTP/1.1
```
```
GET https://example.com/comments/1
```
```
https://example.com/comments/1
```
If request method is omitted, request will be treated as __GET__, so above requests are the same after parsing.

### Request Headers
The lines immediately after the request line to first empty line are parsed as _Request Headers_. Please provide headers with the standard `field-name: field-value` format, each line represents one header.
Below are examples of _Request Headers_:
```
user-agent: rest-client
accept-language: en-GB,en-US;q=0.8,en;q=0.6,zh-CN;q=0.4
```

### Request Body
If you want to provide the request body, please add a blank line after the request headers like the POST example in usage, and all content after it will be treated as _Request Body_.
Below are examples of _Request Body_:

```
POST https://example.com/comments HTTP/1.1
content-type: application/xml
authorization: token xxx

<request>
    <name>sample</name>
    <time>Wed, 21 Oct 2015 18:27:50 GMT</time>
</request>
```

## Settings
* `rest-client.clearoutput`: Clear previous output for each request. (Default is __false__)
* `rest-client.followredirect`: Follow HTTP 3xx responses as redirects. (Default is __true__)
* `rest-client.defaultuseragent`: If User-Agent header is omitted in request header, this value will be added as user agent for each request. (Default is __vscode-restclient__)

## License
[MIT License](LICENSE)

## Change Log
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
