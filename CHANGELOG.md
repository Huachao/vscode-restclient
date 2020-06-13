## 0.24.1 (2020/6/13)
* __Bug Fix__: [Query strings not working on multiple lines](https://github.com/Huachao/vscode-restclient/issues/607)

## 0.24.0 (2020/6/12)
* __Feature__: [AWS Signature version 4 authentication](https://github.com/Huachao/vscode-restclient/pull/586) ([@sebastian-fredriksson-bernholtz](https://github.com/sebastian-fredriksson-bernholtz))
* __Feature__: [Present an Option to Confirm Send](https://github.com/Huachao/vscode-restclient/pull/538) ([@ChayimFriedman2](https://github.com/ChayimFriedman2))
* __Feature__: [Add support for the XDG directory specification](https://github.com/Huachao/vscode-restclient/pull/590) ([@tristan957](https://github.com/tristan957))
* __Bug Fix__: [Fix request line parse error if url contains http](https://github.com/Huachao/vscode-restclient/issues/543)
* __Bug Fix__: [$guid parameter reported as not found in editor](https://github.com/Huachao/vscode-restclient/issues/551)
* __Bug Fix__: [Space in URL causes wrong colorization](https://github.com/Huachao/vscode-restclient/issues/584)
* __Bug Fix__: [Suppress response body validation for empty JSON response](https://github.com/Huachao/vscode-restclient/issues/598)
* __Bug Fix__: [Escape quotes for decodeEscapedUnicodeCharacters](https://github.com/Huachao/vscode-restclient/pull/602) ([@Treno1](https://github.com/Treno1))
* __Bug Fix__: Fix Basic/Digest auth scheme not case-insensitive
* __Bug Fix__: Fix incorrect header in saved response
* __Improvement__: [Fix demo http request syntax in *README.md*](https://github.com/Huachao/vscode-restclient/pull/542) ([@Baoyx007](https://github.com/Baoyx007))
* __Improvement__: [Refine *README.md* usage section](https://github.com/Huachao/vscode-restclient/pull/591) ([@matyasforian](https://github.com/matyasforian))
* __Improvement__: Support query line syntax highlight
* __Improvement__: Support more code snippet clients


## 0.23.2 (2020/3/9)
* __Bug Fix__: [Redirect 303 use port of original request](https://github.com/Huachao/vscode-restclient/issues/502)
* __Bug Fix__: [Cookie header not respected when `rest-client.rememberCookiesForSubsequentRequest` is set to `false`](https://github.com/Huachao/vscode-restclient/issues/507)
* __Bug Fix__: [Fix cookies not sent when redirection happens](https://github.com/Huachao/vscode-restclient/issues/513)
* __Bug Fix__: Disable folding on non range start line in webview
* __Bug Fix__: Fix Basic auth not working in auth challenge case
* __Bug Fix__: [Hover peeking doesn't work for variables with hyphen](https://github.com/Huachao/vscode-restclient/issues/534)
* __Bug Fix__: [Textmate lexer file is invalid](https://github.com/Huachao/vscode-restclient/issues/517)
* __Improvement__: [Add `[%]envVarName` option to `{{$dotenv}}`](https://github.com/Huachao/vscode-restclient/issues/512)
* __Improvement__: [Basic authentication encoding doesn't support empty password](https://github.com/Huachao/vscode-restclient/issues/533)
* __Improvement__: Decrease bundled size from *2.6M* to *2.3M*
* __Improvement__: Allow public prefix for cookiJar

## 0.23.1 (2020/1/21)
* __Bug Fix__: [Respect user provided cookie headers](https://github.com/Huachao/vscode-restclient/issues/465)
* __Bug Fix__: [Cannot read property `toFixed` of null](https://github.com/Huachao/vscode-restclient/issues/450)
* __Bug Fix__: [Fix incorrect RFC 1123 date time format in datetime system variable](https://github.com/Huachao/vscode-restclient/issues/464)
* __Bug Fix__: [Ignore cookie domain mismatch error in `SetCookie` header](https://github.com/Huachao/vscode-restclient/issues/470)
* __Bug Fix__: [Set correct line ending character for multipart/form-data MIME type](https://github.com/Huachao/vscode-restclient/issues/456)
* __Bug Fix__: [Disable automatical retry on failure](https://github.com/Huachao/vscode-restclient/issues/490)
* __Bug Fix__: [fix command `rest-client-*` not found error](https://github.com/Huachao/vscode-restclient/pull/449) ([@stegano](stegano))
* __Improvement__: [Support empty value for file varaible](https://github.com/Huachao/vscode-restclient/issues/322)
* __Improvement__: [Collapse/Expand children recursively in response webview with `Shift` modifier key](https://github.com/Huachao/vscode-restclient/issues/484)
* __Improvement__: [Show request name if available in symbol list](https://github.com/Huachao/vscode-restclient/issues/461)
* __Improvement__: [Use document level cache to improve parsing performance](https://github.com/Huachao/vscode-restclient/issues/463)
* __Improvement__: Support cancelling an outgoing request by clicking the spin icon
* __Improvement__: Refresh diagnostic information when switching environment

## 0.23.0 (2019/11/20)
* __Feature__: [Add new system varaible - .env file variable](https://github.com/Huachao/vscode-restclient/issues/418)
* __Feature__: [Add new system varaible - local datetime](https://github.com/Huachao/vscode-restclient/issues/433)
* __Bug Fix__: [308 Permanent Redirect changes method to GET](https://github.com/Huachao/vscode-restclient/issues/436)
* __Bug Fix__: [Command `Copy As cURL` not working for request method in lower case](https://github.com/Huachao/vscode-restclient/issues/431)
* __Bug Fix__: [Preserve custom request header case](https://github.com/Huachao/vscode-restclient/issues/435)
* __Bug Fix__: Fix scroll to top not working
* __Improvement__: [Replaced images with vscode-icons](https://github.com/Huachao/vscode-restclient/pull/440) ([@lochstar](lochstar))
* __Improvement__: [Ignore user provided `Content-Length` value](https://github.com/Huachao/vscode-restclient/issues/424)

## 0.22.2 (2019/9/25)
* __Feature__: Go to definition support for request variables
* __Bug Fix__: [Fix header auto completion is broken](https://github.com/Huachao/vscode-restclient/issues/422)
* __Bug Fix__: [Shared variables are no longer accessible when selecting `No Environment`](https://github.com/Huachao/vscode-restclient/issues/420)

## 0.22.1 (2019/9/19)
* __Breaking Change__: Remove snippet support `plain text`
* __Feature__: [Add setting to display request name as response tab title](https://github.com/Huachao/vscode-restclient/pull/400) ([@lochstar](https://github.com/lochstar))
* __Feature__: [Allow environment variables to reference shared variables](https://github.com/Huachao/vscode-restclient/pull/409) ([@snackb](https://github.com/snackb))
* __Improvement__: Add CSP for response and code snippet webviews
* __Improvement__: Support multipart mime types of request

## 0.22.0 (2019/7/31)
* __Feature__: [Add support for `GraphQL`](https://github.com/Huachao/vscode-restclient/pull/384) ([@ferronrsmith](https://github.com/ferronrsmith))
* __Feature__: [Add new system variable - local machine environment variable](https://github.com/Huachao/vscode-restclient/pull/366) ([@mtnrbq](https://github.com/mtnrbq))
* __Improvement__: [Reduce the extension size by excluding unnecessary images](https://github.com/Huachao/vscode-restclient/pull/397) ([@badre429](https://github.com/badre429))
* __Improvement__: Reduce the extension size by excluding `node_modules` directory
* __Improvement__: Replace spinner with octicon animation
* __Improvement__: Upgrade httpsnippet package to support new languages and frameworks, e.g., `PowerShell`, `Fetch API`
* __Bug Fix__: [Do not swallow last character in datetime format string](https://github.com/Huachao/vscode-restclient/issues/367)
* __Bug Fix__: [Allow request body file path contains whitespaces](https://github.com/Huachao/vscode-restclient/issues/376)
* __Bug Fix__: [Support extract JSON body with pure string payload with `$`](https://github.com/Huachao/vscode-restclient/issues/266)

## 0.21.3 (2019/5/15)
* __Breaking Change__: Remove support for setting `rest-client.showEnvironmentStatusBarItem` in favor of automatically hide status bar for non-http file feature
* __Feature__: [Support custom display formats in datetime system variable](https://github.com/Huachao/vscode-restclient/pull/361) ([@connelhooley](https://github.com/connelhooley))
* __Improvement__: Hide the environment status bar for non-http file
* __Bug Fix__: [Add title for scroll-to-top button](https://github.com/Huachao/vscode-restclient/issues/355)
* __Bug Fix__: [Failed to generate Objective-C code snippet for request body contains `null` characters](https://github.com/Huachao/vscode-restclient/issues/349)

## 0.21.2 (2019/3/6)
* __Feature__: [Add copy response body feature](https://github.com/Huachao/vscode-restclient/pull/317) ([@viktor-evdokimov](https://github.com/viktor-evdokimov))
* __Feature__: [Add options to disable codelens/links](https://github.com/Huachao/vscode-restclient/issues/295)
* __Improvement__: [Ability to force newline at end of request body for `application/x-ndjson`](https://github.com/Huachao/vscode-restclient/issues/292)
* __Bug Fix__: [Cannot copy request as cURL or generate snippet if host looks invalid](https://github.com/Huachao/vscode-restclient/issues/328)
* __Bug Fix__: [Unable to send requests "multipart/form-data" that contains binary files](https://github.com/Huachao/vscode-restclient/issues/332)
* __Bug Fix__: [Add missing query string when using python(requests library) to generate code snippet](https://github.com/Huachao/vscode-restclient/issues/338)
* __Bug Fix__: [Fix year 2018 -> 2019](https://github.com/Huachao/vscode-restclient/pull/318) ([@alaatm](https://github.com/alaatm))
* __Bug Fix__: Fix request symbols not working when request url depends on requests not sent or request is in curl format

## 0.21.1 (2019/1/8)
* __Feature__: Add fold/unfold full response body features in the response preview panel
* __Bug Fix__: [Copy request as cURL not working](https://github.com/Huachao/vscode-restclient/issues/308)
* __Bug Fix__: [AAD Auth stopped to work in new version - 0.21.0](https://github.com/Huachao/vscode-restclient/issues/309)

## 0.21.0 (2019/1/3)
* __Bug Fix__: [Unable to collapse the json response body](https://github.com/Huachao/vscode-restclient/issues/301)
* __Improvement__: [Use Webpack to bundle extension to improve activation time and high CPU load](https://github.com/Huachao/vscode-restclient/issues/257)
* __Improvement__: Update _RFC1322_ to _RFC1123_

## 0.20.4 (2018/12/2)
* __Feature__: [Support file variables reference other file variables](https://github.com/Huachao/vscode-restclient/issues/247)
* __Feature__: [Support file variables reference system and environment variables](https://github.com/Huachao/vscode-restclient/issues/208)
* __Improvement__: [Display actual response for image `HEAD` request](https://github.com/Huachao/vscode-restclient/issues/293)
* __Bug Fix__: [Redirect all 3xx requests](https://github.com/Huachao/vscode-restclient/issues/285)
* __Bug Fix__: [Parse request body correctly of `multipart/mixed` mime type](https://github.com/Huachao/vscode-restclient/issues/232)

## 0.20.3 (2018/11/1)
* __Bug Fix__: [Cannot read property 'toLowerCase' of null](https://github.com/Huachao/vscode-restclient/issues/219)
* __Bug Fix__: [Fix incorrect JSON body rendering for variable reference syntax](https://github.com/Huachao/vscode-restclient/issues/264)
* __Bug Fix__: [Do not decode percent encoding in response body](https://github.com/Huachao/vscode-restclient/issues/280)
* __Bug Fix__: [Do not use system environment variables if proxy setting already set](https://github.com/Huachao/vscode-restclient/issues/273)
* __Bug Fix__: [Handle compressed responses](https://github.com/Huachao/vscode-restclient/issues/282)
* __Improvement__: Use new `setTextDocumentLanguage` API to refacotr text document view rendering

## 0.20.2 (2018/10/10)
* __Bug Fix__: [Recognize file variable value contains whitespaces](https://github.com/Huachao/vscode-restclient/issues/264)

## 0.20.1 (2018/10/9)
* __Bug Fix__: [Broken works with certificates](https://github.com/Huachao/vscode-restclient/issues/263)

## 0.20.0 (2018/10/8)
* __Feature__: [Support file variables reference request variables](https://github.com/Huachao/vscode-restclient/issues/181)
* __Feature__: [Support resolve the full response body regardless of the response content type](https://github.com/Huachao/vscode-restclient/issues/188)
* __Bug Fix__: [Fix Https proxy issue](https://github.com/Huachao/vscode-restclient/issues/255)
* __Bug Fix__: [Reload configuration when switching active text editor](https://github.com/Huachao/vscode-restclient/issues/245)
* __Bug Fix__: Fix incorrect http symbol range
* __Bug Fix__: Ensure response saving directory existence before saving
* __Improvement__: Add icon for response webview tab
* __Improvement__: [Switch JSON formatting library from `jsonc-parser` to `js-beautify`](https://github.com/Huachao/vscode-restclient/pull/233) ([@ygraber](https://github.com/ygraber))
* __Improvement__: [Treat the mime type of response body is `application/json` if the body itself is a `JSON` string](https://github.com/Huachao/vscode-restclient/issues/239)
* __Improvement__: [Unset gzip setting to avoid adding `Accept-Encoding` header automatically](https://github.com/Huachao/vscode-restclient/issues/256)
* __Improvement__: [Upgrade applicationinsights to latest version to avoid monkey patching](https://github.com/Huachao/vscode-restclient/issues/260)


## 0.19.1 (2018/8/7)
* __Bug Fix__: [Make Azure AAD Auth respect the audience](https://github.com/Huachao/vscode-restclient/issues/225)
* __Bug Fix__: [Fix curl command can't be run on Windows](https://github.com/Huachao/vscode-restclient/issues/227)
* __Bug Fix__: [Add setting `decodeEscapedUnicodeCharacters` to decode escaped characters in response body](https://github.com/Huachao/vscode-restclient/issues/230)
* __Bug Fix__: Fix copy request as curl issue when request block leads with blank lines
* __Improvement__: [Show response in the right editor](https://github.com/Huachao/vscode-restclient/issues/216)
* __Improvement__: [Add `formParamEncodingStrategy` setting to control the form param encoding behavior](https://github.com/Huachao/vscode-restclient/issues/222)
* __Improvement__: [Add `addRequestBodyLineIndentationAroundBrackets` setting to control the request body indent behavior](https://github.com/Huachao/vscode-restclient/issues/226)

## 0.19.0 (2018/6/28)
* __Breaking Change__: Remove support for setting `rest-client.defaultuseragent`, replace this with `rest-client.defaultHeaders` which has more capability to add other default request headers
* __Breaking Change__: Remove support for setting `rest-client.previewResponseInActiveColumn`, replace this with `rest-client.previewColumn` which has more capability to specify which column to preview, not just currently active one
* __Feature__: [Add support for default headers](https://github.com/Huachao/vscode-restclient/pull/206) ([@Kronuz](https://github.com/Kronuz))
* __Feature__: [Show response preview in right editor](https://github.com/Huachao/vscode-restclient/issues/216)
* __Feature__: [Preserve focus of the http editor](https://github.com/Huachao/vscode-restclient/issues/167)
* __Bug Fix__: [Setting: 'previewOption' does not work in combination with 'previewResponseInUntitledDocument'](https://github.com/Huachao/vscode-restclient/issues/183)
* __Bug Fix__: Fix Chinese encoding not copied to clipboard
* __Improvement__: [Retina icon](https://github.com/Huachao/vscode-restclient/pull/217) ([@pluwen](https://github.com/pluwen))
* __Improvement__: Add http language default configuration `editor.quickSuggestions`
* __Improvement__: Refactor resolving http variables logic
* __Improvement__: Leverage new Webview API to render response and code snippet

## 0.18.4 (2018/5/4)
* __Feature__: [Open a saving dialogue when saving response and response body](https://github.com/Huachao/vscode-restclient/issues/186)
* __Bug Fix__: [Do not empty rulesets](https://github.com/Huachao/vscode-restclient/pull/203) ([@mtxr](https://github.com/mtxr))
* __Bug Fix__: Fix document link broken
* __Improvement__: Add syntax highlight for curl requests in http file
* __Improvement__: Improve cpu usage to eliminate unnecessary allocation for Regex inside loop

## 0.18.3 (2018/4/23)
* __Feature__: [Support multiline x-www-form-urlencoded request body](https://github.com/Huachao/vscode-restclient/issues/169)
* __Improvement__: [Limiting linting to local files](https://github.com/Huachao/vscode-restclient/pull/196) ([@lostintangent](https://github.com/lostintangent))
* __Improvement__: Improvement response body syntax highlight

## 0.18.2 (2018/4/17)
* __Feature__: [Add system variable `datetime` to generate a _ISO8601_ or _RFC1123_ format datetime](https://github.com/Huachao/vscode-restclient/issues/180)
* __Bug Fix__: [Allow request variable resolving whole xml document in response/request body](https://github.com/Huachao/vscode-restclient/issues/188)
* __Bug Fix__: [Fix only one request is allowed per line](https://github.com/Huachao/vscode-restclient/issues/189)
* __Bug Fix__: [Relative certificate path resolving not working](https://github.com/Huachao/vscode-restclient/issues/190)
* __Improvement__: [Restricting language services to local files](https://github.com/Huachao/vscode-restclient/pull/187) ([@lostintangent](https://github.com/lostintangent))
* __Improvement__: [Modify not sent request variable diagnostic level from Error to Information](https://github.com/Huachao/vscode-restclient/issues/184)

## 0.18.1 (2018/3/30)
* __Bug Fix__: Fix auto autocompletion not working after introducing request variables

## 0.18.0 (2018/3/29)
* __Feature__: [Add request variable support to provide the possibility to extract values from response](https://github.com/Huachao/vscode-restclient/pull/140) ([@cbrevik](https://github.com/cbrevik))
* __Feature__: [Add indentation based response folding in webview](https://github.com/Huachao/vscode-restclient/issues/157)
* __Feature__: [Add option to preview response in current active view column](https://github.com/Huachao/vscode-restclient/issues/172)
* __Bug Fix__: [Fix JSON response zero fractions removed error when formatting](https://github.com/Huachao/vscode-restclient/issues/171)
* __Bug Fix__: [Fix excluding hosts w/o ports bug](https://github.com/Huachao/vscode-restclient/pull/176) ([@realskim](https://github.com/realskim))
* __Bug Fix__: Retrieve `enableTelemetry` setting from `rest-client` section
* __Improvement__: [Adding Visual Studio Live Share support - Document Link Provider](https://github.com/Huachao/vscode-restclient/pull/174) ([@lostintangent](https://github.com/lostintangent))
* __Improvement__: [Allow specifying $aadToken audience](https://github.com/Huachao/vscode-restclient/pull/161) ([@flanakin](https://github.com/flanakin/))
* __Improvement__: Change the preview url suffix to `.html`

## 0.17.0 (2018/1/30)
* __Feature__: [Add Azure Active Directory Support](https://github.com/Huachao/vscode-restclient/pulls/150) ([@flanakin](https://github.com/flanakin/))
* __Feature__: [Highlight JSON/XML request body automatically](https://github.com/Huachao/vscode-restclient/issues/135)
* __Feature__: [Add settings to disable response formatting and link recognition for large response](https://github.com/Huachao/vscode-restclient/issues/147)
* __Improvement__: Refactor sending request body from specified file path logic
* __Improvement__: Add _8443_ port as _https_ scheme indicator
* __Improvement__: Support `--data-ascii` option in curl

## 0.16.2 (2017/12/22)
* __Feature__: Add custom variable references codelens
* __Bug Fix__: [In single line query string mode, continuous whitespaces were collapsed into one](https://github.com/Huachao/vscode-restclient/issues/143)
* __Bug Fix__: [In multiple lines query string mode, query parameter without '=' and value is ignored](https://github.com/Huachao/vscode-restclient/issues/144)
* __Bug Fix__: Recognize indented request headers
* __Improvement__: [Allow hiding switch environment status bar item via settings](https://github.com/Huachao/vscode-restclient/pull/142) ([@VFK](https://github.com/VFK/))
* __Improvement__: Update `ECONNREFUSED` error message to hint possible incorrect proxy setting
* __Improvement__: Use pure delimiter lines as folding boundary

## 0.16.1 (2017/11/17)
* __Feature__: [Support shared variables can be used across all the environments](https://github.com/Huachao/vscode-restclient/issues/128)
* __Feature__: [Request block fold/unfold feature in .http/.rest file](https://github.com/Huachao/vscode-restclient/issues/139)

## 0.16.0 (2017/10/30)
* __Feature__: [Support goto symbols(request or file level custom variable) in http file](https://github.com/Huachao/vscode-restclient/issues/126)
* __Bug Fix__: Set the scheme to `https` if host is of port 443
* __Improvement__: [Adopt multi root workspace API](https://github.com/Huachao/vscode-restclient/issues/133)
* __Improvement__: Update README.md to reflect installation and code lens update

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
* __Improvement__: [use new vscode api to preview untitled document](https://github.com/Huachao/vscode-restclient/pull/93) ([@dakaraphi](https://github.com/dakaraphi/))

## 0.14.2 (2017/5/3)
* __Bug Fix__: Fix MIME types autocompletion bug
* __Improvement__: Add autocompletion for Basic Auth and Digest Auth
* __Improvement__: Add request body document link provider to allow user to click to referenced document

## 0.14.1 (2017/4/7)
* __Bug Fix__: [Could not resolve any model with provided uri](https://github.com/Huachao/vscode-restclient/issues/90)
* __Improvement__: [Icon redesign](https://github.com/Huachao/vscode-restclient/pull/87) ([@pluwen](https://github.com/pluwen))
* __Improvement__: [Switch to new API for opening editor](https://github.com/Huachao/vscode-restclient/pull/89) ([@dakaraphi](https://github.com/dakaraphi/))

## 0.14.0 (2017/4/3)
* __Feature__: [Support Digest Authentication](https://github.com/Huachao/vscode-restclient/issues/61)
* __Feature__: [Support client side certificate authentication](https://github.com/Huachao/vscode-restclient/issues/35)
* __Bug Fix__: [Fix showResponseInDifferentTab doesn't work](https://github.com/Huachao/vscode-restclient/issues/81)
* __Improvement__: Add setting to the trunked transfer encoding for sending file content as request body
* __Improvement__: [Allow to preview response body only in untitled document](https://github.com/Huachao/vscode-restclient/pull/82) ([@dakaraphi](https://github.com/dakaraphi/))
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
* __Improvement__: [Add snippets for DELETE and PUT requests](https://github.com/Huachao/vscode-restclient/pull/45) ([@Meir017](https://github.com/Meir017/))
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
* __Bug Fix__: [Fix command 'rest-client.request' not found on Linux](https://github.com/Huachao/vscode-restclient/issues/38) ([@myakimov](https://github.com/myakimov))

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
* __Feature__: Support comment shortcut, request body indentation and auto closing brackets
* __Improvement__: [Add loading icon in status bar](https://github.com/Huachao/vscode-restclient/issues/13)

## 0.7.1 (2016/8/9)
* __Bug Fix__: [Filter comments start with white spaces](https://github.com/Huachao/vscode-restclient/issues/28)
* __Bug Fix__: [Display request error for invalid header](https://github.com/Huachao/vscode-restclient/issues/12)

## 0.7.0 (2016/8/3)
* __Feature__: [Support Cookies](https://github.com/Huachao/vscode-restclient/issues/8)
* __Feature__: [Proxy Support](https://github.com/Huachao/vscode-restclient/issues/25) ([@mad-mike](https://github.com/mad-mike/))
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
