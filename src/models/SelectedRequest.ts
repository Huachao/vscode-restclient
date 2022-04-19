import { RequestMetadata } from './requestMetadata';

export interface SelectedRequest {
    text: string;

    metadatas: Map<RequestMetadata, string | undefined>;
}