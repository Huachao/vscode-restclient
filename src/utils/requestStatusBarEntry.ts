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
                this.showDurationEntry('$(sync~spin) Waiting', 'Click to cancel', 'rest-client.cancel-request');
                break;

            case RequestState.Cancelled:
                this.showDurationEntry('$(circle-slash) Cancelled');
                break;

            case RequestState.Received:
                const response = status.response;
                const tooltip = [
                    'Breakdown of Duration:',
                    `Socket: ${response.timingPhases.wait?.toFixed(1) ?? 0}ms`,
                    `DNS: ${response.timingPhases.dns?.toFixed(1) ?? 0}ms`,
                    `TCP: ${response.timingPhases.tcp?.toFixed(1) ?? 0}ms`,
                    `Request: ${response.timingPhases.request?.toFixed(1) ?? 0}ms`,
                    `FirstByte: ${response.timingPhases.firstByte?.toFixed(1) ?? 0}ms`,
                    `Download: ${response.timingPhases.download?.toFixed(1) ?? 0}ms`
                ].join(EOL);

                this.showDurationEntry(`$(clock) ${response.timingPhases.total ?? 0}ms`, tooltip);
                this.showSizeEntry(response);
                break;
        }
    }

    private showSizeEntry(response: HttpResponse) {
        this.sizeEntry.text = `$(database) ${filesize(response.bodySizeInBytes + response.headersSizeInBytes)}`;
        this.sizeEntry.tooltip = [
            'Breakdown of Response Size:',
            `Headers: ${filesize(response.headersSizeInBytes)}`,
            `Body: ${filesize(response.bodySizeInBytes)}`
        ].join(EOL);
        this.sizeEntry.show();
    }

    private showDurationEntry(text: string, tooltip?: string, command?: string) {
        this.durationEntry.text = text;
        this.durationEntry.tooltip = tooltip;
        this.durationEntry.command = command;
        this.durationEntry.show();
    }
}