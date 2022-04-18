import * as appInsights from "applicationinsights";
import { extensions } from 'vscode';
import * as Constants from '../common/constants';
import { SystemSettings } from '../models/configurationSettings';

appInsights.setup(Constants.AiKey)
    .setAutoCollectConsole(false)
    .setAutoCollectDependencies(false)
    .setAutoCollectExceptions(false)
    .setAutoCollectPerformance(false)
    .setAutoCollectRequests(false)
    .setAutoDependencyCorrelation(false)
    .setUseDiskRetryCaching(true)
    .start();

export class Telemetry {
    private static readonly restClientSettings: SystemSettings = SystemSettings.Instance;

    private static defaultClient: appInsights.TelemetryClient;

    public static initialize() {
        this.defaultClient = appInsights.defaultClient;
        const context = this.defaultClient.context;
        const extension = extensions.getExtension(Constants.ExtensionId);
        context.tags[context.keys.applicationVersion] = extension?.packageJSON.version;
    }

    public static sendEvent(eventName: string, properties?: { [key: string]: string }) {
        try {
            if (this.restClientSettings.enableTelemetry) {
                this.defaultClient.trackEvent({ name: eventName, properties });
            }
        } catch {
        }
    }
}

Telemetry.initialize();