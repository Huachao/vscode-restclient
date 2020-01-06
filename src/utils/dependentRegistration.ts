import { Disposable } from 'vscode';
import { RestClientSettings } from '../models/configurationSettings';
import { RestClientSettingsVS } from '../models/restClientSettingsVS';

class ConditionalRegistration {
    private registration: Disposable | undefined;

    public constructor(private readonly doRegister: () => Disposable) {
    }

    public dispose() {
        if (this.registration) {
            this.registration.dispose();
            this.registration = undefined;
        }
    }

    public update(enabled: boolean) {
        if (enabled) {
            if (!this.registration) {
                this.registration = this.doRegister();
            }
        } else {
            if (this.registration) {
                this.registration.dispose();
                this.registration = undefined;
            }
        }
    }
}

export class ConfigurationDependentRegistration {
    private readonly settings: RestClientSettingsVS = RestClientSettings.Instance as RestClientSettingsVS;
    private readonly registration: ConditionalRegistration;

    public constructor(register: () => Disposable, private readonly settingValueFunc: (settings: RestClientSettings) => boolean) {
        this.registration = new ConditionalRegistration(register);
        this.update();
        this.settings.onDidChangeConfiguration(this.update, this);
    }

    public dispose() {
        this.registration.dispose();
    }

    private update() {
        this.registration.update(this.settingValueFunc(this.settings));
    }
}
