export class ImporterUtilities {

    public static parseStringAsComment(str: string, symbol: string = '#', whitespaceAfterSymbol: boolean = true): string {
        return str.replace(/\n/g, '\n' + symbol) + (whitespaceAfterSymbol ? ' ' : '');
    }
}