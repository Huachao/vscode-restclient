import { HttpRequest } from '../models/httpRequest';

export class RequestStore {
    private readonly cache: Map<string, HttpRequest> = new Map<string, HttpRequest>();
    private readonly cancelledRequestIds: Set<string> = new Set<string>();
    private readonly completedRequestIds: Set<string> = new Set<string>();
    private currentRequestId: string;

    private static _instance: RequestStore;

    public static get Instance(): RequestStore {
        if (!RequestStore._instance) {
            RequestStore._instance = new RequestStore();
        }

        return RequestStore._instance;
    }

    private constructor() {
    }

    public add(requestId: string, request: HttpRequest) {
        if (request && requestId) {
            this.cache.set(requestId, request);
            this.currentRequestId = requestId;
        }
    }

    public getLatest(): HttpRequest | undefined {
        return this.cache.get(this.currentRequestId);
    }

    public cancel(requestId?: string) {
        requestId = requestId || this.currentRequestId;
        this.cancelledRequestIds.add(requestId);
    }

    public isCancelled(requestId: string) {
        return this.cancelledRequestIds.has(requestId);
    }

    public complete(requestId: string) {
        return requestId && this.completedRequestIds.add(requestId);
    }

    public isCompleted(requestId?: string) {
        requestId = requestId || this.currentRequestId;
        return this.completedRequestIds.has(requestId);
    }
}