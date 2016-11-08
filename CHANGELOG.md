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
* __Improvement__: Support {{$randomInt}} gloabl system variables, add function to adjust time base on current time for {{$timestamp}} variable

## 0.8.5 (2016/10/11)
* __Bug Fix__: [DO NOT escapse '<' and '>' in response](https://github.com/Huachao/vscode-restclient/issues/41)
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
* __Bug Fix__: [Add option to show response in seperate tabs](https://github.com/Huachao/vscode-restclient/issues/23)
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
* __Bug Fix__: Escapse `<` and `>` in response headers

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
