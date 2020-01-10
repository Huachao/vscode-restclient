import { ResolveErrorMessage } from "../../models/httpVariableResolveResult";
import { VariableType } from "../../models/variableType";
import { HttpVariable, HttpVariableProvider } from "./httpVariableProvider";

export class DummyVariableProvider implements HttpVariableProvider {
    private static _instance: DummyVariableProvider;

    public static get Instance(): DummyVariableProvider {
        if (!DummyVariableProvider._instance) {
            DummyVariableProvider._instance = new DummyVariableProvider();
        }

        return DummyVariableProvider._instance;
    }

    private constructor() {
    }

    public readonly type: VariableType = VariableType.Dummy;

    public async has(name: string): Promise<boolean> {
        return false;
    }

    public async get(name: string): Promise<HttpVariable> {
        return { name, error: ResolveErrorMessage.EnvironmentVariableNotExist };
    }

    public async getAll(): Promise<HttpVariable[]> {
        return [];
    }
}
