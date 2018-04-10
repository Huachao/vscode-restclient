'use strict';

import { Headers } from './models/base';
import { RestClientSettings } from './models/configurationSettings';
import * as Constants from './constants';
import * as appInsights from "applicationinsights";

appInsights.setup(Constants.AiKey).start();

export class Telemetry {
    private static readonly restClientSettings: RestClientSettings = new RestClientSettings();

    public static sendEvent(eventName: string, properties?: Headers) {
        try {
            if (Telemetry.restClientSettings.enableTelemetry) {
                appInsights.defaultClient.trackEvent({name: eventName, properties});
            }
        } catch {
        }
    }
}