export enum LogLevel {
    Verbose,
    Info,
    Warn,
    Error,
}

export function fromString(value: string): LogLevel {
    value = value.toLowerCase();
    switch (value) {
        case 'verbose':
            return LogLevel.Verbose;
        case 'info':
            return LogLevel.Info;
        case 'warn':
            return LogLevel.Warn;
        case 'error':
        default:
            return LogLevel.Error;
    }
}
