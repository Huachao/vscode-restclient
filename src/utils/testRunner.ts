import { expect } from 'chai';
import { HttpResponse } from '../models/httpResponse';
import { TestCollector } from './testCollector';
import { TestRunnerResult } from './testRunnerResult';
import { TestRunnerStates } from './TestRunnerStates';

export class TestRunner {

    public constructor(public response: HttpResponse) { }

    public execute(stream: string): TestRunnerResult {
        let state = TestRunnerStates.Excepted;
        let message = '';
        const rc = new TestCollector();

        try {
            const testFunction = Function("response", "expect", "rc", stream);
            testFunction(this.response, expect, rc);
            state = TestRunnerStates.RanToCompletion;
        } catch (error) {
            message = error.message;
        }

        return new TestRunnerResult(state , message, rc);
    }
}