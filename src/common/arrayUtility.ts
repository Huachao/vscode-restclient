'use strict';

export class ArrayUtility {
    public static skipWhile<T>(items: T[], callbackfn: (value: T, index: number, array: T[]) => boolean): T[] {
        let index = 0;
        for (; index < items.length; index++) {
            if (!callbackfn(items[index], index, items)) {
                break;
            }
        }

        return items.slice(index);
    };

    public static firstIndexOf<T>(items: T[], callbackfn: (value: T, index: number, array: T[]) => boolean, start?: number): number {
        if (!start) {
            start = 0;
        }

        let index = start;
        for (; index < items.length; index++) {
            if (callbackfn(items[index], index, items)) {
                break;
            }
        }

        return index >= items.length ? -1 : index;
    }
}
