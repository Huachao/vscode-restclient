'use strict';

import { HttpRequest } from './models/httpRequest';
import { HttpResponse } from './models/httpResponse';

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


// keep sure to have no conflicts with variables
// when executing script code
export async function runRequestScript(_57b252af4b9749f6a793ac3342d748ae_mk_23979_tm_5979: RunRequestScriptOptions) {
    // tslint:disable-next-line:no-unused-variable
    const $vscode = require('vscode');
    // tslint:disable-next-line:no-unused-variable
    const $workspaces = $vscode.workspace.workspaceFolders;

    // tslint:disable-next-line:no-unused-variable
    const _ = require('lodash');
    // tslint:disable-next-line:no-unused-variable
    const $cwd = _57b252af4b9749f6a793ac3342d748ae_mk_23979_tm_5979.cwd;

    // tslint:disable-next-line:no-unused-variable
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

    // tslint:disable-next-line:no-unused-variable
    const $fs = require('fs-extra');

    // tslint:disable-next-line:no-unused-variable
    const $glob = require('glob');
    // tslint:disable-next-line:no-unused-variable
    const $linq = require('node-enumerable');
    // tslint:disable-next-line:no-unused-variable
    const $minimatch = require('minimatch');
    // tslint:disable-next-line:no-unused-variable
    const $moment = require('moment');

    // tslint:disable-next-line:no-unused-variable
    const $now = () => $moment();

    // tslint:disable-next-line:no-unused-variable
    const $path = require('path');

    // tslint:disable-next-line:no-unused-variable
    let $lastRequest: HttpRequest;
    // tslint:disable-next-line:no-unused-variable
    let $lastResponse: HttpResponse;
    // tslint:disable-next-line:no-unused-variable
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
        } catch (e) {
            if (complete) {
                await Promise.resolve(
                    complete(e, null, httpRequest)
                );
            } else {
                throw e;
            }
        }

        return httpResponse;
    };

    // tslint:disable-next-line:no-unused-variable
    const $require = function(id: string) {
        return require(id);
    };

    // tslint:disable-next-line:no-unused-variable
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
            } catch (e) {
                reject(e);
            }
        });
    };

    // tslint:disable-next-line:no-unused-variable
    const $utc = () => $moment.utc();
    // tslint:disable-next-line:no-unused-variable
    const $uuid = _57b252af4b9749f6a793ac3342d748ae_mk_23979_tm_5979.uuid;

    // tslint:disable-next-line:no-unused-variable
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
        // tslint:disable-next-line:no-unused-variable
        const $progress = (msg: string) => {
            _5979_tm_23979_mk_b1f2710f140b4581bc8ceeabf7f71d33.report({
                message: msg,
            });
        };

        // tslint:disable-next-line:no-unused-variable
        const $start = $moment();
        // tslint:disable-next-line:no-unused-variable
        const $runsSince = function (unitOfTime?, precise?: boolean) {
            if (arguments.length > 1) {
                precise = !!precise;
            }

            return $moment().diff($start, unitOfTime, precise);
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
