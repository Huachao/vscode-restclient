import * as appInsights from "applicationinsights";
import packageJson from '../../package.json';
import * as Constants from '../common/constants';
import { RestClientSettings } from '../models/configurationSettings';

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
    private static readonly restClientSettings: RestClientSettings = RestClientSettings.Instance;

    private static defaultClient: appInsights.TelemetryClient;

    public static initialize() {
        this.defaultClient = appInsights.defaultClient;
        const context = this.defaultClient.context;
        context.tags[context.keys.applicationVersion] = packageJson.version;
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