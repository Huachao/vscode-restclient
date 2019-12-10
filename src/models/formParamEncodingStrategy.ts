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
        case 'automatic':
        default:
            return FormParamEncodingStrategy.Automatic;
    }
}
