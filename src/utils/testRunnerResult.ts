import { TestCollector } from "./testCollector";
import { TestRunnerStates } from "./TestRunnerStates";
export class TestRunnerResult {
    public constructor(
        public status: TestRunnerStates = TestRunnerStates.Excepted,
        public message: string = '',
        public tests: TestCollector = new TestCollector()
    ) { }
}