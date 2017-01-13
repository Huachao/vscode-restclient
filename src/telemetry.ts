'use strict';

import { RestClientSettings } from './models/configurationSettings';
import * as Constants from './constants';

const appInsights = require("applicationinsights");

export class Telemetry {
    private static readonly restClientSettings: RestClientSettings = new RestClientSettings();

    public static sendEvent(eventName: string, properties?: { [key: string]: string }) {
        try {
            let client = appInsights.getClient(Constants.AiKey);
            if (Telemetry.restClientSettings.enableTelemetry) {
                client.trackEvent(eventName, properties);
            }
        } catch (error) {
        }
    }
}