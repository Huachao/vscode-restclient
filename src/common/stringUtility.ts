export class StringUtility {
  public static getUntil(source: string, separator: string): string {
    const index = source.indexOf(separator);
    return -1 === index ? source : source.substr(0, index);
  }
}
