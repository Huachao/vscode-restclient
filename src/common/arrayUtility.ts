export class ArrayUtility {
    public static firstIndexOf<T>(items: T[], callbackfn: (value: T, index: number, array: T[]) => boolean, start: number = 0): number {
        for (; start < items.length; start++) {
            if (callbackfn(items[start], start, items)) {
                return start;
            }
        }

        return -1;
    }
}
