# SP REST Client

SharePoint REST Client makes it easy for you to test SharePoint REST API inside VSCode.   

> `SP REST Client` built on top of awesome [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) created by Huachao Mao.  
Thus `SP REST Client` implements all features from `REST Client` and adds convenient silent SharePoint authentication layer. `SP REST Client` introduced some architecture and performance changes making it impossible to properly merge with `REST Client`, that's why separate add-in was created.  

### If you like it, consider starring original `REST Client` on [github repository](https://github.com/Huachao/vscode-restclient) or [Visual Studio MarketPlace](https://marketplace.visualstudio.com/items?itemName=humao.rest-client). 

## How to use  
> **NOTE**: There might be issues when running both `REST Client` and `SP REST Client` at the same time. It's recommended to install only one of them.

For all `REST Client` features please refer to the original [REST Client docs](https://marketplace.visualstudio.com/items?itemName=humao.rest-client).   
This readme describes how to setup `SP REST Client` to work with SharePoint.   

In order to successfully run REST queries against SharePoint, you need to configure your authentication data. All authentication data is stored inside `.json` files. `SP REST Client` is implemented using [`node-sp-auth`](https://github.com/s-KaiNet/node-sp-auth) module, thus supports various authentication scenarios.   

Below are the configuration steps required:

1. Generate a file with your credentials. For that purpose you need [`node-sp-auth-config`](https://github.com/koltyakov/node-sp-auth-config) CLI.   
 Install CLI by running 
    ```bash
    npm install node-sp-auth-config -g
    ```

    In your working folder run 
    ```bash
    sp-auth init -p <path to your .json file with credentials>
    ```

    Follow instructions and generate a file with your credentials data.   
 2. In VSCode open Workspace Settings. Add a new [environment](https://github.com/Huachao/vscode-restclient#environments), give it a name, say `default`. Add a new [variable](https://github.com/Huachao/vscode-restclient#variables) to your `default` environment called `sp-auth`. Put a path to your `.json` file with credentials generated at step `#1` as value for `sp-auth` variable. If your file is stored inside your workspace, you should put workspace-relative path. However you can also put absolute path to the file.  

    For given project structure:
    ```
    <your root project folder>
    |-- <.vscode>
    |   `-- settings.json
    `-- <config>
        `-- creds.json
    ```
    your rest-client environment configuration will be:
    ```json
    "rest-client.environmentVariables": {
          "$shared": {},
          "default": {
              "sp-auth": "./config/creds.json",
          }
      }
    ```
3. Open your `.http` or `.rest` file and change your active environment to `default` (`Ctrl+Alt+E` (`Cmd+Alt+E` for macOS), or press F1 and then select/type `Rest Client: Switch Environment`), or click on active environment in the right bottom area of VSCode (by default `No Environemnt` should be displayed). Read more [here](https://github.com/Huachao/vscode-restclient#http-language) about language support and file associations. 
4. You're ready to run your REST query. For your REST API requests use the same url you provided under credentials configuration.    

