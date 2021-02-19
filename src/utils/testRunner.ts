import { assert, expect } from 'chai';
import { HttpResponse } from '../models/httpResponse';
import { TestCollector } from './testCollector';
import { TestRunnerResult } from './testRunnerResult';

const stackLineRegex = /\(eval.+<anonymous>:(?<line>\d+):(?<column>\d+)\)/;

/**
 * Runs tests against an HttpResponse and returns a TestRunnerResult describing the outcome.
 */
export class TestRunner {

    public constructor(public response: HttpResponse) { }

    public execute(testLines: string | undefined): TestRunnerResult {
        if (!testLines) {
            return TestRunnerResult.noTests();
        }

        const rc = new TestCollector();

        try {
            const testFunction = Function(
                "request",
                "response",
                "expect",
                "assert",
                "rc",
                testLines);

            testFunction(
                {
                    method: this.response.request.method,
                    url: this.response.request.url,
                    headers: this.response.request.headers,
                    body: this.response.request.body,
                    name: this.response.request.name,
                },
                {
                    statusCode: this.response.statusCode,
                    statusMessage: this.response.statusMessage,
                    httpVersion: this.response.httpVersion,
                    headers: this.response.headers,
                    body: this.response.body,
                    bodySizeInBytes: this.response.bodySizeInBytes,
                    headersSizeInBytes: this.response.headersSizeInBytes,
                },
                expect,
                assert,
                rc);
        } catch (error) {
            let errorLine = '';
            if (error.stack) {
                const match = error.stack.match(stackLineRegex);

                if (match && match.groups?.line && match.groups?.column) {
                    const line = Number(match?.groups?.line) - 1;
                    const column = match?.groups?.column;
                    errorLine = `${line}:${column}`;
                }
            }

            return TestRunnerResult.excepted(
                error.name ?? 'Unknown Error',
                error.message ?? error.toString(),
                errorLine);
        }

        return TestRunnerResult.ranToCompletion(rc);
    }
}