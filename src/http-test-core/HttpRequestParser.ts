import { HttpRequest, HttpMethod } from "../types";
import { logVerbose } from "../utils/logger";
import { VariableManager } from "./VariableManager";
import { TestParser } from "./TestParser";

export class HttpRequestParser {
  private variableManager: VariableManager;
  private testParser: TestParser;

  constructor(variableManager: VariableManager) {
    this.variableManager = variableManager;
    this.testParser = new TestParser(variableManager);
  }

  parse(section: string): HttpRequest {
    const lines = section.split('\n');
    const request = this.initializeRequest(lines[0]);
    
    const [requestLines, testLines] = this.splitRequestAndTestLines(lines.slice(1));
    
    this.parseRequestLines(requestLines, request);
    const { tests, variableUpdates } = this.testParser.parse(testLines);
    request.tests = tests;
    request.variableUpdates.push(...variableUpdates);

    return request;
  }

  private initializeRequest(firstLine: string): HttpRequest {
    return {
      name: firstLine.replace(/^###\s*/, '').trim(),
      method: 'GET',
      url: '',
      headers: {},
      tests: [],
      variableUpdates: [],
    };
  }

  private splitRequestAndTestLines(lines: string[]): [string[], string[]] {
    const testStartIndex = lines.findIndex(line => line.startsWith('####'));
    if (testStartIndex === -1) {
      return [lines, []];
    }
    return [lines.slice(0, testStartIndex), lines.slice(testStartIndex)];
  }

  private parseRequestLines(lines: string[], request: HttpRequest): void {
    let isParsingBody = false;
    let bodyContent = '';

    for (const line of lines) {
      if (line.trim() === '') {
        isParsingBody = true;
        continue;
      }

      if (isParsingBody) {
        bodyContent += line + '\n';
      } else if (line.startsWith('@')) {
        this.handleVariable(line, request);
      } else if (this.isHttpMethod(line)) {
        this.setRequestMethod(line, request);
      } else if (line.includes(':')) {
        this.handleHeader(line, request);
      }
    }

    if (bodyContent.trim()) {
      request.body = this.parseBody(bodyContent);
    }
  }

  private isHttpMethod(line: string): boolean {
    return /^(GET|POST|PUT|DELETE|PATCH)\s/.test(line);
  }

  private setRequestMethod(line: string, request: HttpRequest): void {
    const [method, url] = line.split(/\s+/);
    request.method = method as HttpMethod;
    
    // Decode URL after variable replacement
    const replacedUrl = this.variableManager.replaceVariables(url.trim());
    try {
        request.url = decodeURIComponent(replacedUrl);
        logVerbose(`Set method: ${request.method}, URL: ${request.url}`);
    } catch (error) {
        // If decoding fails, use the URL as-is
        request.url = replacedUrl;
        logVerbose(`URL decoding failed, using raw URL: ${request.url}`);
    }
}

  private handleHeader(line: string, request: HttpRequest): void {
    const [key, ...valueParts] = line.split(':');
    const value = valueParts.join(':').trim();
    request.headers[key.trim()] = this.variableManager.replaceVariables(value);
    logVerbose(`Added header: ${key.trim()}: ${request.headers[key.trim()]}`);
  }

  private handleVariable(line: string, request: HttpRequest): void {
    const [key, value] = line.slice(1).split('=').map(s => s.trim());
    if (value.startsWith('$.')) {
      // JSONPath 표현식을 사용하는 변수 업데이트
      request.variableUpdates.push({ key, value });
    } else {
      // 일반 변수 설정
      this.variableManager.setVariable(key, value);
    }
    logVerbose(`Added variable update: ${key} = ${value}`);
  }

  private parseBody(bodyContent: string): string {
    return bodyContent.trim();
  }
}