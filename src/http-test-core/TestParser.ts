import { TestItem, Assertion } from "../types";
import { VariableManager } from "./VariableManager";

export class TestParser {
  private variableManager: VariableManager;

  constructor(variableManager: VariableManager) {
    this.variableManager = variableManager;
  }

  parse(lines: string[]): {
    tests: TestItem[];
    variableUpdates: { key: string; value: string }[];
  } {
    const tests: TestItem[] = [];
    const variableUpdates: { key: string; value: string }[] = [];
    let currentTest: TestItem | null = null;
    for (const line of lines) {

      if (line.startsWith("####")) {
        if (currentTest) {
          tests.push(currentTest);
        }
        currentTest = this.createNewTest(line);
      } else if (line.trim().match(/^@\w+\s*=\s*.+/)) {

        // 변수 업데이트 라인 처리
        const [key, value] = line.split(/\s*=\s*/, 2);
        variableUpdates.push({ 
          key: key.slice(1).trim(), 
          value: this.variableManager.replaceVariables(value.trim()) 
        });
      } else if (currentTest && line.includes(":")) {
        const assertion = this.parseAssertion(line);
        if (assertion) {
          currentTest.assertions.push(assertion);
        }
      }
    }
    if (currentTest) {
      tests.push(currentTest);
    }
    return { tests, variableUpdates };
  }

  private createNewTest(line: string): TestItem {
    return {
      type: "Assert",
      name: line.replace(/^####\s*/, "").trim(),
      assertions: [],
    };
  }

  private parseAssertion(line: string): Assertion | null {
    const [key, ...valueParts] = line.split(":");
    const value = valueParts.join(":").trim();
    switch (key.trim().toLowerCase()) {
      case "status":
        return this.parseStatusAssertion(value);
      case "content-type":
        return { type: "header", key: "Content-Type", value };
      case "body":
        return null;
      case "_customassert":
        return {
          type: "custom",
          value: this.variableManager.replaceVariables(value),
        };
      default:
        if (key.trim().startsWith("$")) {
          return {
            type: "body",
            key: key.trim(),
            value: this.parseValue(value),
          };
        }
        return { type: "body", key: key.trim(), value };
    }
  }

  private parseStatusAssertion(value: string): Assertion | null {
    const statusValue = value.trim().toLowerCase();
    if (["2xx", "3xx", "4xx", "5xx"].includes(statusValue)) {
      return { type: "status", value: statusValue };
    }
    const statusCode = parseInt(value, 10);
    if (!isNaN(statusCode)) {
      return { type: "status", value: statusCode };
    }
    return null;
  }

  private parseValue(value: string): string | number | boolean {
    if (!isNaN(Number(value))) {
      return Number(value);
    } else if (value.toLowerCase() === "true") {
      return true;
    } else if (value.toLowerCase() === "false") {
      return false;
    }
    return this.variableManager.replaceVariables(value);
  }
}
