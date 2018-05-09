'use strict';

import * as appInsights from "applicationinsights";
import * as Constants from './constants';
import { RestClientSettings } from './models/configurationSettings';

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

    public static sendEvent(eventName: string, properties?: { [key: string]: string }) {
        try {
            if (Telemetry.restClientSettings.enableTelemetry) {
                appInsights.defaultClient.trackEvent({name: eventName, properties});
            }
        } catch {
        }
    }
}