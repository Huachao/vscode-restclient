import { TextDocument } from "vscode";
import { VariableType } from "../../models/variableType";
import { HttpVariable, HttpVariableContext} from "../../models/httpVariable";

export interface HttpVariableProvider {
    readonly type: VariableType;
    has(name: string, document?: TextDocument, context?: HttpVariableContext): Promise<boolean>;
    get(name: string, document?: TextDocument, context?: HttpVariableContext): Promise<HttpVariable>;
    getAll(document?: TextDocument, context?: HttpVariableContext): Promise<HttpVariable[]>;
}
