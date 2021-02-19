/**
 * Represents the result of a single test.
 */
export class TestResult {
    public constructor(public name: string, public passed: boolean, public message: string) { }
}