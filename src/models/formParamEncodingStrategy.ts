'use strict';

export enum FormParamEncodingStrategy {
    Automatic,
    Never,
    Always,
}

export function fromString(value: string): FormParamEncodingStrategy {
    value = value.toLowerCase();
    switch (value) {
        case 'never':
            return FormParamEncodingStrategy.Never;
        case 'always':
            return FormParamEncodingStrategy.Always;
        default:
            return FormParamEncodingStrategy.Automatic;
    }
}
