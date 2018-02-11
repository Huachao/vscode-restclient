'use strict';

import { HttpRequest } from './models/httpRequest';
import { HttpResponse } from './models/httpResponse';
import * as m from 'moment';

type EachAction = (item: any, index: number, previousResult: any) => any;

export interface RequestBuilderOptions {
    vars: VarsFromScript;
}

type RequestCompleteAction = (err: any, response?: HttpResponse, request?: HttpRequest) => any;

export interface RunOptions {
    request: HttpRequest;
}

export interface RunRequestScriptOptions {
    buildRequest: (options: RequestBuilderOptions) => PromiseLike<HttpRequest>;
    cwd: string;
    requestFile: string;
    run: (options: RunOptions) => PromiseLike<HttpResponse>;
    script: string;
    scriptFile: string;
    uuid: any;
}

export type VarsFromScript = { [name: string]: any };


export async function runRequestScript(
    // keep sure to have no conflicts with variables
    // when executing script code
    _57b252af4b9749f6a793ac3342d748ae_mk_23979_tm_5979: RunRequestScriptOptions
)
{
    const $vscode = require('vscode');    
    const $workspaces = $vscode.workspace.workspaceFolders;

    const _ = require('lodash');
    const $cwd = _57b252af4b9749f6a793ac3342d748ae_mk_23979_tm_5979.cwd;

    const $each = async function(list, action: EachAction) {
        let lastResult: any;

        if (list) {
            let index = -1;
            for (const ITEM of list) {
                ++index;

                if (action) {
                    lastResult = await Promise.resolve(
                        action(ITEM, index, lastResult)
                    );
                }
            }
        }

        return lastResult;
    };

    const $fs = require('fs-extra');

    const $glob = require('glob');
    const $linq = require('node-enumerable');
    const $minimatch = require('minimatch');
    const $moment = require('moment');

    const $now = () => $moment();

    const $path = require('path');

    let $lastRequest: HttpRequest;
    let $lastResponse: HttpResponse;
    const $request = async (vars?: VarsFromScript, complete?: RequestCompleteAction) => {
        let httpRequest: HttpRequest;
        let httpResponse: HttpResponse;
        try {
            httpRequest = await _57b252af4b9749f6a793ac3342d748ae_mk_23979_tm_5979.buildRequest({
                vars,
            });
            $lastRequest = httpRequest;

            httpResponse = await _57b252af4b9749f6a793ac3342d748ae_mk_23979_tm_5979.run({
                request: httpRequest,
            });
            $lastResponse = httpResponse;

            if (complete) {
                await Promise.resolve(
                    complete(null, httpResponse, httpRequest)
                );
            }
        }
        catch (e) {
            if (complete) {
                await Promise.resolve(
                    complete(e, null, httpRequest)
                );
            }
            else {
                throw e;
            }
        }

        return httpResponse;
    };

    const $require = function(id: string) {
        return require(id);
    };

    const $sleep = function (ms?: number) {
        if (arguments.length < 1) {
            ms = 1000;
        }
        ms = parseInt(('' + ms).trim());

        return new Promise((resolve, reject) => {
            try {
                setTimeout(() => {
                    resolve();
                }, ms);
            }
            catch (e) {
                reject(e);
            }
        });
    };

    const $utc = () => $moment.utc();
    const $uuid = _57b252af4b9749f6a793ac3342d748ae_mk_23979_tm_5979.uuid;

    const $fullPath = function (fullOrRelativePath: string, basePath?: string) {
        if (arguments.length < 2) {
            basePath = $workspaces[0].uri.fsPath;
        }
        basePath = '' + basePath;
        if (!$path.isAbsolute(basePath)) {
            basePath = $path.join($workspaces[0].uri.fsPath, basePath);
        }
        basePath = $path.resolve(basePath);

        fullOrRelativePath = '' + fullOrRelativePath;
        if (!$path.isAbsolute(fullOrRelativePath)) {
            fullOrRelativePath = $path.join(basePath, fullOrRelativePath);
        }

        return $path.resolve(fullOrRelativePath);
    };

    await $vscode.window.withProgress({
        location: $vscode.ProgressLocation.Window,
    }, async (
        // keep sure to have no conflicts with variables
        // when executing script code
        _5979_tm_23979_mk_b1f2710f140b4581bc8ceeabf7f71d33
    ) => {
        const $progress = (msg: string) => {
            _5979_tm_23979_mk_b1f2710f140b4581bc8ceeabf7f71d33.report({
                message: msg,
            });
        };

        const $start = $moment();
        const $runsSince = function (unitOfTime?, precise?: boolean) {
            if (arguments.length > 1) {
                precise = !!precise;
            }

            return m().diff($start, unitOfTime, precise);
        };

        $progress(
            _.isNil(_57b252af4b9749f6a793ac3342d748ae_mk_23979_tm_5979.scriptFile) ?
                `Running REST script for '${$path.basename(_57b252af4b9749f6a793ac3342d748ae_mk_23979_tm_5979.requestFile)}'...` :
                `Running REST script '${$path.basename(_57b252af4b9749f6a793ac3342d748ae_mk_23979_tm_5979.scriptFile)}' for '${$path.basename(_57b252af4b9749f6a793ac3342d748ae_mk_23979_tm_5979.requestFile)}'...`
        );

        return Promise.resolve(
            eval(_57b252af4b9749f6a793ac3342d748ae_mk_23979_tm_5979.script)
        );    
    });
}
