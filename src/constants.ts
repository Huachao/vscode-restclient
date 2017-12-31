'use strict';

export const ExtensionId: string = 'humao.rest-client';
export const AiKey: string = 'ad746e27-4a36-441c-8b94-5db178f81ae3';
export const CSSFileName: string = 'rest-client.css';
export const CSSFolderName: string = 'styles';
export const ExtensionFolderName: string = '.rest-client';
export const HistoryFileName: string = 'history.json';
export const CookieFileName: string = 'cookie.json';
export const EnvironmentFileName: string = 'environment.json';
export const DefaultResponseDownloadFolderName: string = 'responses/raw';
export const DefaultResponseBodyDownloadFolerName: string = 'responses/body';
export const HistoryItemsMaxCount: number = 50;

export const NoEnvironmentSelectedName: string = 'c0cfe680-4fcd-4b71-a4ba-8cfaee57680a';

export const TimeStampVariableName = "$timestamp";
export const TimeStampVariableDescription = "Add a number of milliseconds between 1970/1/1 UTC Time and now. \
 You can also provide the offset with current time in the format {{$timestamp number string}}";
export const GuidVariableName = "$guid";
export const GuidVariableDescription = "Add a RFC 4122 v4 UUID";
export const RandomInt = "$randomInt";
export const RandomIntDescription = "Returns a random integer between min (included) and max (excluded)";

export const AzureActiveDirectoryVariableName = "$aadToken";
export const AzureActiveDirectoryDescription = "Prompts to sign in to Azure AD and adds the token to the request";
export const AzureActiveDirectoryClientId = "aebc6443-996d-45c2-90f0-388ff96faa56";  // VS Code client id
export const AzureActiveDirectoryForceNewOption = "new";
export const AzureActiveDirectorySignInUrls = {
    ppe: "https://login.windows-ppe.net/",  // for testing purposes only
    public: "https://login.microsoftonline.com/",
    cn: "https://login.chinacloudapi.cn/",
    de: "https://login.microsoftonline.de/",
    us: "https://login.microsoftonline.us/",
};

export const CommentIdentifiersRegex: RegExp = /^\s*(#|\/{2})/;

export const VariableDefinitionRegex: RegExp = /^\s*@([^\s=]+)\s*=\s*(.+)\s*$/;