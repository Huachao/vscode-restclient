import { TestCollector } from "./testCollector";
import { TestRunnerError } from "./TestRunnerError";
import { TestRunnerStates } from "./TestRunnerStates";

/**
 * The result of a test run.
 */
export class TestRunnerResult {
    public status: TestRunnerStates;
    public tests: TestCollector;
    public error?: TestRunnerError;

    public static noTests(): TestRunnerResult {
        const result: TestRunnerResult = {
            status: TestRunnerStates.NoTests,
            tests: new TestCollector()
        };

        return result;
    }

    public static ranToCompletion(tests: TestCollector): TestRunnerResult {
        const result: TestRunnerResult = {
            status: TestRunnerStates.RanToCompletion,
            tests: tests
        };

        return result;
    }

    public static excepted(name: string, message: string, line: string): TestRunnerResult {
        const result: TestRunnerResult = {
            status: TestRunnerStates.Excepted,
            tests: new TestCollector(),
            error: new TestRunnerError(name, message, line)
        };

        return result;
    }
}