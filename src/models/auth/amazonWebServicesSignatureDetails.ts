export class AmazonWebServicesSignatureDetails {
    accessId: string;
    accessKey: string;
    sessionToken: string;
    regionName: string;
    serviceName: string;

    toString(): string {
        return `${this.accessId} ` +
            `${this.accessKey} ` +
            `token:${this.sessionToken} ` +
            `region:${this.regionName} ` +
            `service:${this.serviceName} `;
    }
}