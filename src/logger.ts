'use strict';

import { OutputChannel, window } from 'vscode';
import { RestClientSettings } from './models/configurationSettings';
import { LogLevel } from './models/logLevel';

let outputChannel: OutputChannel;

function getOrCreateOutputChannel() {
    if (!outputChannel) {
        outputChannel = window.createOutputChannel('REST');
    }
    return outputChannel;
}

export class Logger {
    private readonly _outputChannel: OutputChannel;
    private readonly _restClientSettings: RestClientSettings = RestClientSettings.Instance;
    public constructor() {
        this._outputChannel = getOrCreateOutputChannel();
    }

    public verbose(message: string, data?: any): void {
        this.log(LogLevel.Verbose, message, data);
    }

    public info(message: string, data?: any): void {
        this.log(LogLevel.Info, message, data);
    }

    public warn(message: string, data?: any): void {
        this.log(LogLevel.Warn, message, data);
    }

    public error(message: string, data?: any): void {
        this.log(LogLevel.Error, message, data);
    }

    public log(level: LogLevel, message: string, data?: any): void {
        if (level >= this._restClientSettings.logLevel) {
            this._outputChannel.appendLine(`[${LogLevel[level]}  - ${(new Date().toLocaleTimeString())}] ${message}`);
            if (data) {
                this._outputChannel.appendLine(this.data2String(data));
            }
        }
    }

    private data2String(data: any): string {
        if (data instanceof Error) {
            return data.stack || data.message;
        }

        if (typeof data === 'string') {
            return data;
        }

        return JSON.stringify(data, null, 2);
    }
}