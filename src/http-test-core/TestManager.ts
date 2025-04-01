import {
  HttpRequest,
  TestResult,
  RunOptions,
  HttpResponse,
  TestItem,
  Assertion,
  LogLevel,
} from "../types";
import { AssertionEngine } from "./AssertionEngine";
import { VariableManager } from "./VariableManager";
import { RequestExecutor } from "./RequestExecutor";
import { ResponseProcessor } from "./ResponseProcessor";
import { TestResultCollector } from "./TestResultCollector";
import {
  logRequestStart,
  logTestResult,
  logTestSummary,
  log,
  setVerbose,
  logError,
} from "../utils/logger";
import path from "path";

export class TestManager {
  private requestExecutor: RequestExecutor;
  private responseProcessor: ResponseProcessor;
  private resultCollector: TestResultCollector;
  private variableManager: VariableManager;
  private assertionEngine: AssertionEngine;
  private baseDir: string;

  constructor(httpFilePath: string) {
    this.baseDir = path.dirname(httpFilePath);
    this.variableManager = new VariableManager();
    this.assertionEngine = new AssertionEngine(this.variableManager, this.baseDir);
    this.requestExecutor = new RequestExecutor(this.variableManager, this.baseDir);
    this.responseProcessor = new ResponseProcessor(this.variableManager);
    this.resultCollector = new TestResultCollector();
  }

  async run(
    requests: HttpRequest[],
    options?: RunOptions
  ): Promise<TestResult[]> {
    setVerbose(!!options?.verbose);

    for (const request of requests) {
      try {
        await this.processRequest(request);
      } catch (error) {
        await this.handleRequestError(error, request);
      }
    }

    const summary = this.resultCollector.getSummary();
    await logTestSummary(summary);

    return this.resultCollector.getResults();
  }

  private async processRequest(request: HttpRequest): Promise<void> {
    logRequestStart(request);
    try {
      const response = await this.requestExecutor.execute(request);
      await this.responseProcessor.process(response, request.variableUpdates);
      const testResults = await this.runTests(request, response);
      for (const result of testResults) {
        this.resultCollector.addResult(result);
        logTestResult(result);
      }
    } catch (error) {
      const errorMessage = `Request failed: ${request.name}\n${
        error instanceof Error ? error.message : String(error)
      }`;
      logError(errorMessage);
      this.resultCollector.addResult({
        name: request.name,
        passed: false,
        error: new Error(errorMessage),
        statusCode: undefined,
      });
    }
  }

  private async runTests(
    request: HttpRequest,
    response: HttpResponse
  ): Promise<TestResult[]> {
    const tests =
      request.tests.length > 0
        ? request.tests
        : [this.createDefaultStatusCodeTest(request.name)];
    const results: TestResult[] = [];

    for (const test of tests) {
      try {
        for (const assertion of test.assertions) {
          await this.assertionEngine.assert(assertion, response, request);
        }
        results.push(this.createTestResult(test, request, response, true));
      } catch (error) {
        results.push(
          this.createTestResult(test, request, response, false, error)
        );
      }
    }

    return results;
  }

  private createTestResult(
    test: TestItem,
    request: HttpRequest,
    response: HttpResponse,
    passed: boolean,
    error?: unknown
  ): TestResult {
    const expectedErrorPassed = request.expectError && !passed;
    return {
      name: test.name || request.name,
      passed: expectedErrorPassed || passed,
      statusCode: response.status,
      error: passed
        ? undefined
        : error instanceof Error
        ? error
        : new Error(String(error)),
    };
  }

  private createDefaultStatusCodeTest(name: string): TestItem {
    return {
      type: "Assert",
      name: `${name} Status OK`,
      assertions: [
        {
          type: "status",
          value: (status: number) => status >= 200 && status < 300,
        } as Assertion,
      ],
    };
  }

  private async handleRequestError(
    error: unknown,
    request: HttpRequest
  ): Promise<void> {
    const errorMessage = `Request failed: ${request.name}\n${
      error instanceof Error ? error.message : String(error)
    }`;
    log(errorMessage, LogLevel.ERROR);
    this.resultCollector.addResult({
      name: request.name,
      passed: false,
      error: new Error(errorMessage),
      statusCode: undefined,
    });
  }
}