'use strict';

import { RestClientSettings } from './models/configurationSettings';
import * as Constants from './constants';

const appInsights = require("applicationinsights");

export class Telemetry {
    private static readonly restClientSettings: RestClientSettings = new RestClientSettings();

    public static sendEvent(eventName: string, properties?: { [key: string]: string }) {
        try {
            if (Telemetry.restClientSettings.enableTelemetry) {
                let client = appInsights.getClient(Constants.AiKey);
                client.trackEvent(eventName, properties);
            }
        } catch (error) {
        }
    }
}