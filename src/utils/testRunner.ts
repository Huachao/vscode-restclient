import { expect } from 'chai';
import { HttpResponse } from '../models/httpResponse';
import { TestCollector } from './testCollector';

export class TestRunner {

    public constructor(public response: HttpResponse) { }

    public execute(stream: string): TestCollector {
        var f = Function("response", "expect", "rc", stream);
        var rc = new TestCollector();

        try {
            f(this.response, expect, rc);
        } catch (error) {
            console.error(error);
        }

        return rc;
    }
}