import { TestResult } from "./testResult";

export class TestCollector {
    public tests: TestResult[] = [];

    public test(name: string, func: Function) {
        try {
            const message = func();
            this.tests.push(new TestResult(name, true, message ?? "Test passed."));
        } catch (error) {
            this.tests.push(new TestResult(name, false, error.message));
        }
    }
}