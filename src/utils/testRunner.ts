import { expect } from 'chai';
import { HttpResponse } from '../models/httpResponse';
import { TestCollector } from './testCollector';

export class TestRunner {

    public constructor(public response: HttpResponse) { }

    public execute(stream: string): TestCollector {
        const testFunction = Function("response", "expect", "rc", stream);
        const rc = new TestCollector();

        try {
            testFunction(this.response, expect, rc);
        } catch (error) {
            console.error(error);
        }

        return rc;
    }
}