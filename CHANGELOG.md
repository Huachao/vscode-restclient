## 0.16.1 (2017/11/17)
* __Feature__: [Support shared variables can be used across all the environemnts](https://github.com/Huachao/vscode-restclient/issues/128)
* __Feature__: [Request block fold/unfold feature in .http/.rest file](https://github.com/Huachao/vscode-restclient/issues/139)

## 0.16.0 (2017/10/30)
* __Feature__: [Support goto symbols(request or file level custom variable) in http file](https://github.com/Huachao/vscode-restclient/issues/126)
* __Improvement__: [Adopt multi root workspace API](https://github.com/Huachao/vscode-restclient/issues/133)
* __Improvement__: Update README.md to reflect installation and code lens update
* __Bug Fix__: Set the scheme to `https` if host is of port 443

## 0.15.3 (2017/9/26)
* __Bug Fix__: [Info/Warning notifications blocking all tabs](https://github.com/Huachao/vscode-restclient/issues/119)
* __Bug Fix__: [cURL -d option not working properly with @](https://github.com/Huachao/vscode-restclient/issues/120)
* __Improvement__: [Show request headers as well as response](https://github.com/Huachao/vscode-restclient/issues/99)

## 0.15.2 (2017/8/22)
* __Breaking Change__ [Remap keybinding of _Cancel Request_ from `Ctrl/Cmd+Alt+Q` to `Ctrl/Cmd+Alt+K`](https://github.com/Huachao/vscode-restclient/issues/115)
* __Bug Fix__: [Missing parameters in CURL/POST body](https://github.com/Huachao/vscode-restclient/issues/112)
* __Bug Fix__: Add telemetry events for copy commands
* __Bug Fix (Partial)__: [Fix request body file path click bug in _Windows_](https://github.com/Huachao/vscode-restclient/issues/110)
* __Bug Fix (Partial)__: [Allow cookie path ends with trailing slash](https://github.com/Huachao/vscode-restclient/issues/113)
* __Bug Fix (Partial)__: [Update README.md to include the details of supported curl options](https://github.com/Huachao/vscode-restclient/issues/113)

## 0.15.1 (2017/8/3)
* __Bug Fix__: Fix autocompletion not working
* __Improvement__: Add backslash to escape special character(`\n`, `\r` and `\t`)

## 0.15.0 (2017/7/28)
* __Feature__: [Define variables inside of HTTP file](https://github.com/Huachao/vscode-restclient/issues/84)
* __Bug Fix__: ["Generate code snippet" does not include the POST body when Content-Type: application/x-www-form-urlencoded](https://github.com/Huachao/vscode-restclient/issues/105)

## 0.14.6 (2017/6/28)
* __Bug Fix__: ["Generate code snippet" does not include the POST body when Content-Type: application/x-www-form-urlencoded](https://github.com/Huachao/vscode-restclient/issues/105)
* __Bug Fix__: [Save cURL into clipboard](https://github.com/Huachao/vscode-restclient/issues/100)

## 0.14.5 (2017/6/15)
* __Feature__: [Save cURL into clipboard](https://github.com/Huachao/vscode-restclient/issues/100)
* __Bug Fix__: ["Generate code snippet" does not encode basic authorization](https://github.com/Huachao/vscode-restclient/issues/98)
* __Bug Fix__: [Variable autocompletion adds escaped brackets instead of brackets](https://github.com/Huachao/vscode-restclient/issues/103)
* __Improvement__: [Variable substitution fails when there is spaces after/before the brackets](https://github.com/Huachao/vscode-restclient/issues/104)

## 0.14.4 (2017/5/16)
* __Bug Fix__: [getting error "Unable to open'Response(xxxms)': Cannot read property 'toLowerCase' of null"](https://github.com/Huachao/vscode-restclient/issues/96)

## 0.14.3 (2017/5/12)
* __Bug Fix__: [Performance issue when rendering large response](https://github.com/Huachao/vscode-restclient/issues/59), [cannot show raw big-data](https://github.com/Huachao/vscode-restclient/issues/94)
* __Bug Fix__: Fix bug to allow generate code snippet for `cURL`, `httpie` and `wget`
* __Improvement__: [use new vscode api to preview untitled document](https://github.com/Huachao/vscode-restclient/pull/93) [(@dakaraphi)](https://github.com/dakaraphi/)

## 0.14.2 (2017/5/3)
* __Bug Fix__: Fix MIME types autocompletion bug
* __Improvement__: Add autocompletion for Basic Auth and Digest Auth
* __Improvement__: Add request body document link provider to allow user to click to referenced document

## 0.14.1 (2017/4/7)
* __Bug Fix__: [Could not resolve any model with provided uri](https://github.com/Huachao/vscode-restclient/issues/90)
* __Improvement__: [Icon redesign](https://github.com/Huachao/vscode-restclient/pull/87) [(@pluwen)](https://github.com/pluwen)
* __Improvement__: [Switch to new API for opening editor](https://github.com/Huachao/vscode-restclient/pull/89) [(@dakaraphi)](https://github.com/dakaraphi/)

## 0.14.0 (2017/4/3)
* __Feature__: [Support Digest Authentication](https://github.com/Huachao/vscode-restclient/issues/61)
* __Feature__: [Support client side certificate authentication](https://github.com/Huachao/vscode-restclient/issues/35)
* __Bug Fix__: [Fix showResponseInDifferentTab doesn't work](https://github.com/Huachao/vscode-restclient/issues/81)
* __Improvement__: Add setting to the trunked transfer encoding for sending file content as request body
* __Improvement__: [Allow to preview response body only in untitled document](https://github.com/Huachao/vscode-restclient/pull/82) [(@dakaraphi)](https://github.com/dakaraphi/)
* __Improvement__: Format response body whose suffix of content type header is json

## 0.13.0 (2017/3/20)
* __Feature__: Allow preview response in untitled document directly to use the full power of VS Code to search, select or manipulate the response
* __Feature__: Support saving response body to corresponding file according to response MIME type, and also provide setting `rest-client.mimeAndFileExtensionMapping` to overwrite the saved file extension
* __Feature__: Display break down response timing details(_Socket_, _DNS_, _TCP_, _First Byte_ and _Download_) in tooltip of duration status bar
* __Feature__: Display breakdown response size(_headers_ and _body_) in tooltip of size status bar
* __Bug Fix__: [Fix auto completion not working sometimes](https://github.com/Huachao/vscode-restclient/issues/76)
* __Bug Fix__: [Image display issue](https://github.com/Huachao/vscode-restclient/issues/80)
* __Improvement__: [Full support multipart/form-data request](https://github.com/Huachao/vscode-restclient/issues/77)
* __Improvement__: Update `Run Request` to `Send Request` in code lense text
* __Improvement__: Make global variable `randomInt` as a snippet string when inserting

## 0.12.3 (2017/2/22)
* __Improvement__: [Add link above the request to send request](https://github.com/Huachao/vscode-restclient/issues/44)
* __Bug Fix__: [Fix regression bug of sending file with relative path](https://github.com/Huachao/vscode-restclient/issues/49)
* __Bug Fix__: [Atom XML not formatted in response preview](https://github.com/Huachao/vscode-restclient/issues/71)

## 0.12.2 (2017/2/14)
* __Feature__: Make link clickable in response body
* __Bug Fix__: [Unable to send multipart/form-data](https://github.com/Huachao/vscode-restclient/issues/66)
* __Bug Fix__: [Remove info in status bar when response views are closed](https://github.com/Huachao/vscode-restclient/issues/52)

## 0.12.1 (2017/1/25)
* __Bug Fix__: [Parse url incorrectly when contains space](https://github.com/Huachao/vscode-restclient/issues/63)
* __Bug Fix__: [Post and Put data not added to the request in code generation](https://github.com/Huachao/vscode-restclient/issues/64)

## 0.12.0 (2017/1/15)
* __Feature__: [Support custom environments and variables](https://github.com/Huachao/vscode-restclient/issues/56)
* __Bug Fix__: [Fix line numbers overlap when response length > 99 lines long](https://github.com/Huachao/vscode-restclient/issues/58)
* __Improvement__: Add scroll to top icon in response and code generation view

## 0.11.4 (2017/1/4)
* __Bug Fix__: Fix extension publish issue

## 0.11.3 (2017/1/4)
* __Bug Fix__: Adds right click menu options to send request and generate code snippet
* __Improvement__: Add SOAP request snippet to help to build SOAP envelope

## 0.11.2 (2016/12/17)
* __Bug Fix__: Fix extension publish issue

## 0.11.1 (2016/12/17)
* __Feature__: [Improve legibility of the text in Response tab](https://github.com/Huachao/vscode-restclient/issues/54)
* __Bug Fix__: [Parse colon(:) in request header correctly](https://github.com/Huachao/vscode-restclient/issues/55)
* __Improvement__: Beautify css response

## 0.11.0 (2016/12/1)
* __Bug Fix__: [Wrap long strings in preview panel](https://github.com/Huachao/vscode-restclient/issues/24)
* __Bug Fix__: [Cancel processing request](https://github.com/Huachao/vscode-restclient/issues/48)
* __Bug Fix__: [Allow refresh from results view](https://github.com/Huachao/vscode-restclient/issues/50)
* __Bug Fix__: [Messy code in the response view when access the unicode website](https://github.com/Huachao/vscode-restclient/issues/51)

## 0.10.6 (2016/11/28)
* __Bug Fix__: Fix regression bug to respect proxy setting

## 0.10.5 (2016/11/21)
* __Bug Fix__: [Support send file with relative path](https://github.com/Huachao/vscode-restclient/issues/49)
* __Improvement__: Display response body size in status bar
* __Improvement__: Make three or more consecutive `#` at the line beginning as request block delimiter

## 0.10.4 (2016/11/16)
* __Improvement__: Get autocompletion items from request history too
* __Improvement__: Improve resolving excluded hosts logic

## 0.10.3 (2016/11/14)
* __Feature__: Allow to specify file path to use as request body
* __Bug Fix__: [Add setting to ignore some proxy hosts](https://github.com/Huachao/vscode-restclient/issues/47)

## 0.10.2 (2016/11/8)
* __Improvement__: [Add snippets for DELETE and PUT requests](https://github.com/Huachao/vscode-restclient/pull/45) [(@Meir017)](https://github.com/Meir017/)
* __Bug Fix__: [Cannot read property 'trim' of undefined](https://github.com/Huachao/vscode-restclient/issues/46)

## 0.10.1 (2016/11/7)
* __Feature__: [Support saving multiple requests in the same file and use three consecutive '#' as delimiter](https://github.com/Huachao/vscode-restclient/issues/21)
* __Feature__: [Allow send request between the delimiters based on the cursor location](https://github.com/Huachao/vscode-restclient/issues/12)
* __Feature__: Support display image response directly in response view
* __Improvement__: Display request triggered time in history view

## 0.10.0 (2016/11/3)
* __Feature__: Support generate code snippets for various languages and libraries
* __Improvement__: Allow copy saved response path
* __Improvement__: Add description for HTTP headers in autocompletion
* __Bug Fix__: Use comma to concat multiple cookies

## 0.9.0 (2016/10/25)
* __Feature__: Add clear history command
* __Improvement__: Display response header in original case

## 0.8.7 (2016/10/17)
* __Improvement__: [Display line numbers in response](https://github.com/Huachao/vscode-restclient/issues/12)

## 0.8.6 (2016/10/14)
* __Bug Fix__: [Handle urls with urlencoded query params](https://github.com/Huachao/vscode-restclient/issues/43)
* __Improvement__: Support {{$randomInt}} global system variables, add function to adjust time base on current time for {{$timestamp}} variable

## 0.8.5 (2016/10/11)
* __Bug Fix__: [DO NOT escape '<' and '>' in response](https://github.com/Huachao/vscode-restclient/issues/41)
* __Improvement__: Show elapsed time in editor tab

## 0.8.4 (2016/9/28)
* __Bug Fix__: [Lower case request header name](https://github.com/Huachao/vscode-restclient/issues/39)
* __Bug Fix__: [Keyboard shortcut conflicts on macOS](https://github.com/Huachao/vscode-restclient/issues/40)

## 0.8.3 (2016/9/27)
* __Improvement__: Support keyboard shortcut for macOS (`Cmd+Alt+R` for request and `Cmd+Alt+H` for history)
* __Bug Fix__: Fix encoding an already encoded URI

## 0.8.2 (2016/9/22)
* __Feature__: Add the capability to save latest response to local file system
* __Bug Fix__: [Encode non-ASCII characters in URL](https://github.com/Huachao/vscode-restclient/issues/36)

## 0.8.1 (2016/9/21)
* __Bug Fix__: [Fix command 'rest-client.request' not found on Linux](https://github.com/Huachao/vscode-restclient/issues/38) [(@myakimov)](https://github.com/myakimov)

## 0.8.0 (2016/9/20)
* __Feature__: [Support global system dynamic variables](https://github.com/Huachao/vscode-restclient/issues/22)
* __Bug Fix__: [Parse request correctly with LF line ending](https://github.com/Huachao/vscode-restclient/issues/37)

## 0.7.5 (2016/9/6)
* __Improvement__: Improve loading performance by fetching highlight.js from local instead of CDN
* __Improvement__: Add application insights for extension to collect usage data

## 0.7.4 (2016/8/31)
* __Improvement__: [Allow query strings spread into multiple lines](https://github.com/Huachao/vscode-restclient/issues/16)

## 0.7.3 (2016/8/23)
* __Bug Fix__: [Concurrent requests corrupted cookie file](https://github.com/Huachao/vscode-restclient/issues/31)
* __Bug Fix__: [Allow request without headers](https://github.com/Huachao/vscode-restclient/issues/32)

## 0.7.2 (2016/8/17)
* __Improvement__: [Add loading icon in status bar](https://github.com/Huachao/vscode-restclient/issues/13)
* __Feature__: Support comment shortcut, request body indentation and auto closing brackets

## 0.7.1 (2016/8/9)
* __Bug Fix__: [Filter comments start with white spaces](https://github.com/Huachao/vscode-restclient/issues/28)
* __Bug Fix__: [Display request error for invalid header](https://github.com/Huachao/vscode-restclient/issues/12)

## 0.7.0 (2016/8/3)
* __Feature__: [Support Cookies](https://github.com/Huachao/vscode-restclient/issues/8)
* __Feature__: [Proxy Support](https://github.com/Huachao/vscode-restclient/issues/25) [(@mad-mike)](https://github.com/mad-mike/)
* __Improvement__: [Wrap long strings in preview tab](https://github.com/Huachao/vscode-restclient/issues/24)

## 0.6.3 (2016/8/1)
* __Bug Fix__: [Add option to show response in separate tabs](https://github.com/Huachao/vscode-restclient/issues/23)
* __Bug Fix__: [Allow -u option in curl request](https://github.com/Huachao/vscode-restclient/issues/26)

## 0.6.2 (2016/7/26)
* __Feature__: Support comments in `.http` and `.rest` files

## 0.6.1 (2016/7/22)
* __Bug Fix__: Update README to reflect latest changes

## 0.6.0 (2016/7/21)
* __Bug Fix__: Preview response with css file which takes theme style into consideration. Fix the issue [avoid the white background](https://github.com/Huachao/vscode-restclient/issues/12)

## 0.5.5 (2016/7/20)
* __Bug Fix__: [Allow host header in request headers](https://github.com/Huachao/vscode-restclient/issues/10)
* __Bug Fix__: [Display raw response if not real json](https://github.com/Huachao/vscode-restclient/issues/14)

## 0.5.4 (2016/7/13)
* __Bug Fix__: Escape string header values

## 0.5.3 (2016/7/13)
* __Improvement__: Format response of `application/xml` type
* __Bug Fix__: Escape `<` and `>` in response headers

## 0.5.2 (2016/6/23)
* __Feature__: Add autocompletion of MIME type for specific headers like `Content-Type` and `Accept`

## 0.5.1 (2016/6/17)
* __Feature__: Add autocomplete for HTTP language

## 0.5.0 (2016/6/16)
* __Feature__: Add HTTP language and syntax highlight
* __Feature__: Add `.http` and `.rest` file extension associations with HTTP language

## 0.4.0 (2016/6/13)
* __Feature__: Add capability to directly run [curl request](https://curl.haxx.se/)

## 0.3.1 (2016/6/6)
* __Feature__: Add get and post code snippet

## 0.3.0 (2016/5/25)
* __Feature__: Display response in a separate pane with syntax highlight

## 0.2.2 (2016/5/19)
* __Bug Fix__: Getting history request items from previous versions

## 0.2.1 (2016/5/18)
* __Feature__: Timeout in milliseconds, less or equal than 0 represents for infinity, default is `0`

## 0.2.0 (2016/4/27)
* __Feature__: Add http request history

## 0.1.1 (2016/4/13)
* __Bug Fix__: Update image in README.md

## 0.1.0 (2016/4/13)
* __Improvement__: Refactor code for rest call
* __Improvement__: Beautify JSON response

## 0.0.6 (2016/4/7)
* __Improvement__: Allow self-signed certificate

## 0.0.5 (2016/4/5)
* __Feature__: Follow HTTP 3xx responses as redirects, default is `TRUE`
* __Feature__: Add default user agent if user not specified, default value is `vscode-restclient`

## 0.0.4 (2016/4/1)
* __Feature__: Allow clear output window before sending a new request

## 0.0.3 (2016/3/31)
* Initial release!
