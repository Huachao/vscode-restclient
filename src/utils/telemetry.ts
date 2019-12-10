import * as appInsights from "applicationinsights";
import packageLockJson from '../../package-lock.json';
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
        Telemetry.defaultClient = appInsights.defaultClient;
        const context = Telemetry.defaultClient.context;
        context.tags[context.keys.applicationVersion] = packageJson.version;
        context.tags[context.keys.internalSdkVersion] = `node:${packageLockJson.dependencies.applicationinsights.version}`;
    }

    public static sendEvent(eventName: string, properties?: { [key: string]: string }) {
        try {
            if (Telemetry.restClientSettings.enableTelemetry) {
                Telemetry.defaultClient.trackEvent({ name: eventName, properties });
            }
        } catch {
        }
    }
}

Telemetry.initialize();