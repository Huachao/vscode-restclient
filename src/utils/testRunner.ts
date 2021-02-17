import { assert, expect } from 'chai';
import { HttpResponse } from '../models/httpResponse';
import { TestCollector } from './testCollector';
import { TestRunnerResult } from './testRunnerResult';

const stackLineRegex = /\(eval.+<anonymous>:(?<line>\d+):(?<column>\d+)\)/;

export class TestRunner {

    public constructor(public response: HttpResponse) { }

    public execute(testLines: string | undefined): TestRunnerResult {
        if (!testLines) {
            return TestRunnerResult.noTests();
        }

        const rc = new TestCollector();

        try {
            const testFunction = Function("response", "expect", "assert", "rc", testLines);
            testFunction(this.response, expect, assert, rc);
        } catch (error) {
            const match = error.stack.match(stackLineRegex);
            const line = Number(match?.groups?.line) - 1;
            const column = match?.groups?.column;
            return TestRunnerResult.excepted(
                error.name,
                error.message,
                `${line}:${column}`);
        }

        return TestRunnerResult.ranToCompletion(rc);
    }
}