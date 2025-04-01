import {
  Assertion,
  CustomValidatorContext,
  HttpRequest,
  HttpResponse,
} from "../types";
import { JSONPath } from "jsonpath-plus";
import { VariableManager } from "./VariableManager";
import { logVerbose, logError } from "../utils/logger";
import { loadCustomValidator } from "../validators/customValidator";
import path from "path";
import { AssertionError } from "../errors/AssertionError";

export class AssertionEngine {
  constructor(
    private variableManager: VariableManager,
    private baseDir: string
  ) {}

  async assert(
    assertion: Assertion,
    response: HttpResponse,
    request: HttpRequest
  ): Promise<void> {
    if (typeof assertion.value === "string") {
      assertion.value = this.variableManager.replaceVariables(assertion.value);
    }

    logVerbose(`Asserting ${JSON.stringify(assertion)}`);

    switch (assertion.type) {
      case "status":
        this.assertStatus(assertion, response);
        break;
      case "header":
        this.assertHeader(assertion, response);
        break;
      case "body":
        await this.assertBody(assertion, response);
        break;
      case "custom":
        await this.assertCustom(assertion, response, request);
        break;
      default:
        throw new AssertionError(
          `Unknown assertion type: ${(assertion as Assertion).type}`
        );
    }
  }

  private assertStatus(assertion: Assertion, response: HttpResponse): void {
    if (typeof assertion.value === "function") {
      if (!assertion.value(response.status)) {
        throw new AssertionError(
          `Status ${response.status} does not meet the assertion criteria`
        );
      }
    } else if (typeof assertion.value === "string") {
      const statusRange = assertion.value.toLowerCase();
      if (statusRange === "2xx") {
        if (response.status < 200 || response.status >= 300) {
          throw new AssertionError(
            `Expected status in 2xx range, got ${response.status}`
          );
        }
      } else if (statusRange === "3xx") {
        if (response.status < 300 || response.status >= 400) {
          throw new AssertionError(
            `Expected status in 3xx range, got ${response.status}`
          );
        }
      } else if (statusRange === "4xx") {
        if (response.status < 400 || response.status >= 500) {
          throw new AssertionError(
            `Expected status in 4xx range, got ${response.status}`
          );
        }
      } else if (statusRange === "5xx") {
        if (response.status < 500 || response.status >= 600) {
          throw new AssertionError(
            `Expected status in 5xx range, got ${response.status}`
          );
        }
      } else {
        throw new AssertionError(`Invalid status range: ${statusRange}`);
      }
    } else if (typeof assertion.value === "number") {
      if (response.status !== assertion.value) {
        throw new AssertionError(
          `Expected status ${assertion.value}, got ${response.status}`
        );
      }
    } else {
      throw new AssertionError("Invalid assertion value for status");
    }
  }

  private assertHeader(assertion: Assertion, response: HttpResponse): void {
    if (!assertion.key) {
      throw new AssertionError("Header key is missing in assertion");
    }
    const headerValue = response.headers[assertion.key.toLowerCase()];
    if (
      typeof headerValue === "string" &&
      typeof assertion.value === "string"
    ) {
      if (assertion.key.toLowerCase() === "content-type") {
        this.assertContentType(headerValue, assertion.value);
      } else if (headerValue !== assertion.value) {
        throw new AssertionError(
          `Expected ${assertion.key} to be ${assertion.value}, got ${headerValue}`
        );
      }
    } else {
      throw new AssertionError(
        `Invalid header value type for ${assertion.key}`
      );
    }
  }

  private assertContentType(actual: string, expected: string): void {
    const expectedType = expected.split(";")[0].trim();
    const actualType = actual.split(";")[0].trim();
    if (expectedType !== actualType) {
      throw new AssertionError(
        `Expected Content-Type to be ${expectedType}, got ${actualType}`
      );
    }
  }

  private async assertBody(
    assertion: Assertion,
    response: HttpResponse
  ): Promise<void> {
    let responseData = this.parseResponseData(response.data);

    if (assertion.key === "$") {
      return;
    } else if (
      typeof assertion.key === "string" &&
      assertion.key.startsWith("$")
    ) {
      this.assertJsonPath(assertion, responseData);
    } else {
      throw new AssertionError(`Invalid body assertion key: ${assertion.key}`);
    }
  }

  private parseResponseData(data: unknown): object {
    if (typeof data === "string" && data.trim() !== "") {
      try {
        return JSON.parse(data);
      } catch (error) {
        throw new AssertionError(
          `Failed to parse response data as JSON: ${error}`
        );
      }
    }
    return data as object;
  }

  private assertJsonPath(assertion: Assertion, responseData: object): void {
    const jsonPath = this.adjustJsonPath(assertion.key as string, responseData);
    const result = JSONPath({ path: jsonPath, json: responseData });
    if (result.length === 0) {
      throw new AssertionError(
        `JSON path ${jsonPath} not found in response: ${JSON.stringify(
          responseData
        )}`
      );
    }
    const actualValue = result[0];
    const expectedValue = this.parseValue(assertion.value as string);
    if (!this.isEqual(actualValue, expectedValue)) {
      throw new AssertionError(
        `Expected ${jsonPath} to be ${JSON.stringify(
          expectedValue
        )}, got ${JSON.stringify(actualValue)}`
      );
    }
  }

  private parseValue(
    value: string | number | boolean
  ): string | number | boolean {
    if (typeof value === "string") {
      if (!isNaN(Number(value))) {
        return Number(value);
      } else if (value.toLowerCase() === "true") {
        return true;
      } else if (value.toLowerCase() === "false") {
        return false;
      }
    }
    return value;
  }
  
  private adjustJsonPath(jsonPath: string, data: unknown): string {
    if (
      typeof data === "object" &&
      data !== null &&
      !Array.isArray(data) &&
      jsonPath.startsWith("$[")
    ) {
      return "$" + jsonPath.slice(2);
    }
    return jsonPath;
  }

  private isEqual(actual: unknown, expected: unknown): boolean {
    if (Array.isArray(actual) && Array.isArray(expected)) {
      return (
        actual.length === expected.length &&
        actual.every((value, index) => this.isEqual(value, expected[index]))
      );
    }
    if (
      typeof actual === "object" &&
      actual !== null &&
      typeof expected === "object" &&
      expected !== null
    ) {
      const actualKeys = Object.keys(actual as object);
      const expectedKeys = Object.keys(expected as object);
      return (
        actualKeys.length === expectedKeys.length &&
        actualKeys.every((key) =>
          this.isEqual(
            (actual as Record<string, unknown>)[key],
            (expected as Record<string, unknown>)[key]
          )
        )
      );
    }
    return actual === expected;
  }

  private async assertCustom(
    assertion: Assertion,
    response: HttpResponse,
    request: HttpRequest
  ): Promise<void> {
    const functionPath = assertion.value as string;
    
    try {
      logVerbose(
        `Running custom validator script: ${functionPath}`
      );
      await this.runCustomValidator(
        functionPath,
        response,
        request
      );
      logVerbose(`Custom validator script executed successfully`);
    } catch (error) {
      logError(
        `Custom validation failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw new AssertionError(
        `Custom validation failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  private async runCustomValidator(
    customFunctionPath: string,
    response: HttpResponse,
    request: HttpRequest
  ): Promise<void> {
    const resolvedPath = this.resolvePath(customFunctionPath);
    const customValidator = await loadCustomValidator(resolvedPath);
    
    const context: CustomValidatorContext = {
      request,
      variables: this.variableManager.getAllVariables(),
    };
    
    try {
      logVerbose(`Executing custom validator from path: ${resolvedPath}`);
      customValidator(response, context);
      logVerbose(`Custom validator executed without error`);
    } catch (error) {
      logError(
        `Error in custom validator: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }
  }

  private resolvePath(customFunctionPath: string): string {
    if (path.isAbsolute(customFunctionPath)) {
      return customFunctionPath;
    }
    return path.resolve(this.baseDir, customFunctionPath);
  }
}
