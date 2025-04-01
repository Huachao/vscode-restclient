import { TestResult, TestSummary } from '../types';

export class TestResultCollector {
  private results: TestResult[] = [];

  addResult(result: TestResult): void {
    this.results.push(result);
  }

  getResults(): TestResult[] {
    return this.results;
  }

  getSummary(): TestSummary {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;

    return {
      totalTests,
      passedTests,
      failedTests,
      results: this.results
    };
  }
}