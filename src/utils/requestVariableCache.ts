import { Event, EventEmitter, TextDocument } from "vscode";
import { DocumentCache } from '../models/documentCache';
import { HttpResponse } from '../models/httpResponse';

type RequestVariableEvent = {
    name: string;
    document: TextDocument;
};

export class RequestVariableCache {
    private static cache = new DocumentCache<Map<string, HttpResponse>>(true);
    // global shared
    private static sharedCache = new DocumentCache<HttpResponse>(true);

    private static readonly eventEmitter = new EventEmitter<RequestVariableEvent>();

    public static get onDidCreateNewRequestVariable(): Event<RequestVariableEvent> {
        return this.eventEmitter.event;
    }

    public static add(document: TextDocument, name: string, response: HttpResponse) {
        if (!this.cache.has(document)) {
            this.cache.set(document, new Map<string, HttpResponse>());
        }

        this.cache.get(document)!.set(name, response);

        // mocking TextDocument
        this.sharedCache.set({ uri: name, version: 1 } as any, response);

        this.eventEmitter.fire({ name, document });
    }

    public static has(document: TextDocument, name: string): boolean {
        return this.cache.has(document) ? this.cache.get(document)!.has(name) : this.sharedCache.has({ uri: name, version: 1 } as any);
    }

    public static get(document: TextDocument, name: string): HttpResponse | undefined {
        return this.cache.get(document)?.get(name) ?? this.sharedCache.get({ uri: name, version: 1 } as any);
    }
}