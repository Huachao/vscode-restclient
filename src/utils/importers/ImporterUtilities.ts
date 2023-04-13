export class ImporterUtilities {

    public static parseMultiLineStringAsMultiLineComment(prefix = '# ', content: string | undefined): string {
        if (content == null) {
            return '';
        }
        const contentWithParsedNewLine = content.replace(/\n/g, '\n' + prefix);
        return prefix + contentWithParsedNewLine;
    }
}