import { Disposable } from "vscode";

export function disposeAll(disposables: Disposable[]) {
    while (disposables.length) {
        const item = disposables.pop();
        if (item) {
            item.dispose();
        }
    }
}