/**
 * Represents an error within the test code.
 * This is commonly syntax or reference errors in the script.
 */
export class TestRunnerError {
    public constructor(public name: string, public message: string, public line: string) { }
}