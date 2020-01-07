import { HttpResponse } from '../models/httpResponse';

type NonReceivedRequestStatus = {
    state: RequestState.Closed | RequestState.Cancelled | RequestState.Error | RequestState.Pending
};

type ReceivedRequestStatus = {
    state: RequestState.Received,
    response: HttpResponse
};

export type RequestStaus = ReceivedRequestStatus | NonReceivedRequestStatus;

export enum RequestState {
    Closed,
    Pending,
    Received,
    Cancelled,
    Error,
}

export interface RequestStatusEntry {
    dispose(): void;

    update(status: RequestStaus): void;
}
