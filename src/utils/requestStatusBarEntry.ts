import { EOL } from 'os';
import { StatusBarAlignment, StatusBarItem, window } from 'vscode';
import { HttpResponse } from '../models/httpResponse';

const filesize = require('filesize');

type NonReceivedRequestStatus = {
    state: RequestState.Closed | RequestState.Cancelled | RequestState.Error | RequestState.Pending
};

type ReceivedRequestStatus = {
    state: RequestState.Received,
    response: HttpResponse
};

type RequestStaus = ReceivedRequestStatus | NonReceivedRequestStatus;

export enum RequestState {
    Closed,
    Pending,
    Received,
    Cancelled,
    Error,
}

export class RequestStatusEntry {
    private readonly durationEntry: StatusBarItem;

    private readonly sizeEntry: StatusBarItem;

    public constructor() {
        this.durationEntry = window.createStatusBarItem(StatusBarAlignment.Left);
        this.sizeEntry = window.createStatusBarItem(StatusBarAlignment.Left);
    }

    public dispose() {
        this.durationEntry.dispose();
        this.sizeEntry.dispose();
    }

    public update(status: RequestStaus) {
        this.sizeEntry.hide();

        switch (status.state) {
            case RequestState.Closed:
            case RequestState.Error:
                this.durationEntry.hide();
                break;

            case RequestState.Pending:
                this.durationEntry.text = `$(sync~spin) Waiting`;
                this.durationEntry.tooltip = 'Click to cancel';
                this.durationEntry.command = 'rest-client.cancel-request';
                this.durationEntry.show();
                break;

            case RequestState.Cancelled:
                this.durationEntry.text = '$(circle-slash) Cancelled';
                this.durationEntry.tooltip = undefined;
                this.durationEntry.command = undefined;
                this.durationEntry.show();
                break;

            case RequestState.Received:
                const response = status.response;
                this.durationEntry.text = `$(clock) ${response.timingPhases.total}ms`;
                this.durationEntry.tooltip = [
                    'Breakdown of Duration:',
                    `Socket: ${response.timingPhases.wait.toFixed(1)}ms`,
                    `DNS: ${response.timingPhases.dns.toFixed(1)}ms`,
                    `TCP: ${response.timingPhases.tcp.toFixed(1)}ms`,
                    `Request: ${response.timingPhases.request.toFixed(1)}ms`,
                    `FirstByte: ${response.timingPhases.firstByte.toFixed(1)}ms`,
                    `Download: ${response.timingPhases.download.toFixed(1)}ms`
                ].join(EOL);
                this.durationEntry.command = undefined;
                this.durationEntry.show();

                this.sizeEntry.text = `$(database) ${filesize(response.bodySizeInBytes + response.headersSizeInBytes)}`;
                this.sizeEntry.tooltip = [
                    'Breakdown of Response Size:',
                    `Headers: ${filesize(response.headersSizeInBytes)}`,
                    `Body: ${filesize(response.bodySizeInBytes)}`
                ].join(EOL);
                this.sizeEntry.show();
                break;
        }
    }
}