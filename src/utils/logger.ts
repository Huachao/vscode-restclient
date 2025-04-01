import * as vscode from 'vscode';
import {
  LogLevel,
  TestSummary,
  HttpRequest,
  TestResult
} from "../types";

let verbose = false;
let outputChannel: vscode.OutputChannel;

export function initLogger(channel: vscode.OutputChannel): void {
  outputChannel = channel;
}

export function setVerbose(v: boolean): void {
  verbose = v;
}

export function log(message?: unknown, level: LogLevel = LogLevel.INFO, ...optionalParams: unknown[]): void {
  if (!outputChannel) {
    return;
  }

  let logMessage = `[${LogLevel[level]}] ${message}`;
  if (optionalParams.length > 0) {
    logMessage += ' ' + optionalParams.map(p => String(p)).join(' ');
  }

  switch (level) {
    case LogLevel.VERBOSE:
      if (verbose) {
        outputChannel.appendLine(logMessage);
      }
      break;
    case LogLevel.INFO:
      outputChannel.appendLine(logMessage);
      break;
    case LogLevel.WARNING:
      outputChannel.appendLine(`⚠️ ${logMessage}`);
      break;
    case LogLevel.ERROR:
      outputChannel.appendLine(`❌ ${logMessage}`);
      break;
    case LogLevel.PLAIN:
      outputChannel.appendLine(String(message));
      break;
    default:
      outputChannel.appendLine(logMessage);
  }
}

export function logVerbose(message?: unknown, ...optionalParams: unknown[]): void {
  log(message, LogLevel.VERBOSE, ...optionalParams);
}

export function logInfo(message?: unknown, ...optionalParams: unknown[]): void {
  log(message, LogLevel.INFO, ...optionalParams);
}

export function logWarning(message?: unknown, ...optionalParams: unknown[]): void {
  log(message, LogLevel.WARNING, ...optionalParams);
}

export function logError(message?: unknown, ...optionalParams: unknown[]): void {
  log(message, LogLevel.ERROR, ...optionalParams);
}

export function logPlain(message?: unknown, ...optionalParams: unknown[]): void {
  log(message, LogLevel.PLAIN, ...optionalParams);
}

export function logRequestStart(request: HttpRequest): void {
  logPlain("\n" + "=".repeat(50));
  logPlain(`📌 Parsed Request: ${request.name}`);
  logPlain("=".repeat(50));
  logVerbose(`Method: ${request.method}`);
  logVerbose(`URL: ${request.url}`);
  logVerbose(`Headers: ${JSON.stringify(request.headers)}`);
  if (request.body) {
    logVerbose(`Body: ${request.body}`);
  }
  
  if (request.tests.length > 0) {
    logVerbose("Tests:");
    request.tests.forEach((test, index) => {
      logVerbose(`  Test ${index + 1}: ${test.name}`);
      test.assertions.forEach(assertion => {
        logVerbose(`    - ${JSON.stringify(assertion)}`);
      });
    });
  }

  if (request.variableUpdates.length > 0) {
    logVerbose("Variable Updates:");
    request.variableUpdates.forEach((update, index) => {
      logVerbose(`  Update ${index + 1}: ${update.key}`);
      logVerbose(`    - ${JSON.stringify(update)}`);
    });
  }

  if (verbose == true) {
    logPlain("=".repeat(50));
  }
}

export function logTestResult(result: TestResult): void {
  const status = result.passed ? "✅ PASS" : "❌ FAIL";
  const statusCode = result.statusCode ? `(Status: ${result.statusCode})` : "";
  const message = `${result.name}: ${status} ${statusCode}`;
  if (result.passed) {
    logInfo(message);
  } else {
    logWarning(message);
    if (result.error) {
      logError(
        result.error instanceof Error
          ? result.error.message
          : String(result.error)
      );
    }
  }
}

export function logTestSummary(summary: TestSummary): void {
  logPlain("\n" + "=".repeat(50));
  logPlain("📊 Test Summary");
  logPlain("=".repeat(50));
  logPlain(`Total Tests: ${summary.totalTests}`);
  logPlain(`Passed Tests: ${summary.passedTests}`);
  logPlain(`Failed Tests: ${summary.failedTests}`);

  const statusEmojis = summary.results
    .map((r) => (r.passed ? "✅" : "❌"))
    .join("");
  logPlain(`\n${statusEmojis}`);

  summary.results.forEach((result, index) => {
    const indent = "  ";
    const status = result.passed ? "✅ PASS" : "❌ FAIL";
    const statusCode = result.statusCode
      ? `(Status: ${result.statusCode})`
      : "";
    const message = `${indent}${index + 1}. ${
      result.name
    }: ${status} ${statusCode}`;
    logPlain(message);
  });
}
