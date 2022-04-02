

import {OutgoingHttpHeaders} from 'http';
import Module from 'module';
import { dirname } from 'path';
import vm from 'vm';
import { TextDocument } from 'vscode';
import { DocumentCache } from '../../models/documentCache';
import { HttpRequest } from '../../models/httpRequest';
import { VariableType } from '../../models/variableType';
import { HttpClient } from '../httpClient';
import { RequestVariableCache } from '../requestVariableCache';
import { EnvironmentVariableProvider } from './environmentVariableProvider';
import { FileVariableProvider } from './fileVariableProvider';
import { HttpVariable, HttpVariableContext, HttpVariableProvider } from './httpVariableProvider';
import { SystemVariableProvider } from './systemVariableProvider';

interface ScriptVariableFunction {
  name: string;
  function: string;
  args: string[];
  values: any[];
  result?: HttpVariable;
}

const FunctionReqex = /function\s?\(([0-9a-zA-z ,]*)\)\s?{(.*)}/;
const ArrowFunctionRegex = /\(?\s?([0-9a-zA-z ,]*)\)?\s?=>\s?(.*)?/;

export class ScriptVariableProvider implements HttpVariableProvider {

  private providerRequestCache = {};

  public readonly type: VariableType = VariableType.Script;

  private readonly scriptVariableCache = new DocumentCache<Map<string, ScriptVariableFunction>>();

  private static _instance: ScriptVariableProvider;

  public static get Instance(): ScriptVariableProvider {
    if (!this._instance) {
      this._instance = new ScriptVariableProvider();
    }
    return this._instance;
  }

  public async has(name: string, document?: TextDocument, context?: HttpVariableContext | undefined): Promise<boolean> {
    return !!this.parseScript(name);
  }
  public async get(name: string, document: TextDocument, context: HttpVariableContext): Promise<HttpVariable> {
      const script = await this.parseCachedScript(name, document, context);
      if (script && document) {
        if (script.result) {
          return script.result;
        }
        script.result = await this.executeScript(script, script.values, document.fileName);
        return script.result;
      } else {
        return {
          name,
          error: 'script variable not valid',
        };
      }
    }
  public async getAll(document?: TextDocument, context?: HttpVariableContext | undefined): Promise<HttpVariable[]> {
    return [];
  }

  private parseScript(name: string): ScriptVariableFunction | null {
  const matches = ArrowFunctionRegex.exec(name) || FunctionReqex.exec(name);
  if (matches && matches.length === 3) {
    return {
      name,
      function: matches[2],
      args: matches[1]
        .split(',')
        .map(obj => obj.trim())
        .filter(obj => obj !== ''),
      values: []
    };
  }
    return null;
  }

  private async parseCachedScript(name: string, document: TextDocument, context: HttpVariableContext): Promise<ScriptVariableFunction | null> {
    const script = this.parseScript(name);

    if (script) {
      for (const arg of script.args) {
        script.values.push(await this.getScriptArgValue(arg, document, context));
      }
      // only cache on filevariables
      if (context.parsedRequest === '') {
        const cacheMap = this.getDocumentCache(document);
        const cachedScript = cacheMap.get(name);

        if (cachedScript
          && this.arrayEquals(script.args, cachedScript.args)
          && this.arrayEquals(script.values, cachedScript.values)) {
          return cachedScript;
        }

        cacheMap.set(name, script);
      }
    }
    return script;
  }


  private async executeScript(script: ScriptVariableFunction, scriptArgValues: any[], fileName: string): Promise<HttpVariable> {
    try {
      const wrappedArgs = ['exports', 'require', 'module', '__filename', '__dirname', ...script.args];

      let moduleExports = `module.exports = ${script.function};`;
      if (script.function.indexOf("return ") >= 0) {
        moduleExports = script.function.replace("return ", "module.exports =");
      }
      const wrappedFunction = `(function (${wrappedArgs.join(',')}){
          ${moduleExports}
        })`;
      const dir = dirname(fileName);
      const scriptModule = new Module(fileName, module.parent as Module);
      scriptModule.filename = fileName;
      scriptModule.exports = {};
      // see https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/loader.js#L565-L640
      scriptModule.paths = (Module as any)._nodeModulePaths(dir);
      const compiledWrapper = vm.runInThisContext(wrappedFunction, {
        filename: fileName,
        lineOffset: 0,
        displayErrors: true
      });
      const scripteRequire: any = (id) => scriptModule.require(id);
      // see https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/loader.js#L823-L911
      scripteRequire.resolve = req => (Module as any)._resolveFilename(req, scriptModule);
      compiledWrapper.apply(scriptModule.exports, [scriptModule.exports, scripteRequire, scriptModule, fileName, dir, ...scriptArgValues]);

      let value = scriptModule.exports;
      if (this.isPromise(scriptModule.exports)) {
        value = await scriptModule.exports;
      }
      module.parent?.children.splice(module.parent.children.indexOf(scriptModule), 1);

      return {
        name: script.name,
        value
      };
    } catch (error) {
      return {
        name: script.name,
        error,
      };
    }
  }

  private getDocumentCache(document: TextDocument) {
    let map = this.scriptVariableCache.get(document);
    if (!map) {
      map = new Map<string, ScriptVariableFunction>();
      this.scriptVariableCache.set(document, map);
    }
    return map;
  }

  private async getScriptArgValue(arg: string, document: TextDocument, context: HttpVariableContext) {
    if (arg === "send") {
      return this.send;
    }

    const result = RequestVariableCache.get(document, arg);
    if (result) {
      return {
        request: result.request,
        response: result,
      };
    }
    const providers = [FileVariableProvider.Instance,
    SystemVariableProvider.Instance,
    EnvironmentVariableProvider.Instance
    ];
    for (const provider of providers) {
      if (await provider.has(arg, document)) {
        if (!this.providerRequestCache[arg]) {
          const promise = provider.get(arg, document, context);
          this.providerRequestCache[arg] = promise;
          const result = await promise;
          delete this.providerRequestCache[arg];
          return result.value;
        }
      }
    }
    return result;
  }

  private isPromise(obj: any): obj is Promise < any > {
    return obj && obj.then;
  }

  private arrayEquals(a: any[], b: any[]) {
    return Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((val, index) => val === b[index]);
  }

  private send(request: {
    method: string,
    url: string,
    headers: OutgoingHttpHeaders,
    body: string | undefined,
    rawBody?: string | undefined,
    name?: string | undefined
  }) {
    const client = new HttpClient();
    return client.send(new HttpRequest(request.method || 'GET', request.url, request.headers, request.body, request.rawBody, request.name));
  }

}