export class ImporterUtilities {

    public static parseMultiLineStringAsMultiLineComment(str: string, symbol: string = '#', whitespaceAfterSymbol: boolean = true): string {
        return str.replace(/\n/g, '\n' + symbol) + (whitespaceAfterSymbol ? ' ' : '');
    }
}