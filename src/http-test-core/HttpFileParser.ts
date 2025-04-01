import { HttpRequestParser } from './HttpRequestParser';
import { HttpRequest } from "../types";
import { readFile } from "../utils/fileUtils";
import { logVerbose } from "../utils/logger";
import { VariableManager } from "./VariableManager";

export class HttpFileParser {
  private variableManager: VariableManager;

  constructor(variableManager: VariableManager) {
    this.variableManager = variableManager;
  }

  async parse(filePath: string): Promise<HttpRequest[]> {
    const content = await readFile(filePath);
    logVerbose(`File content loaded: ${filePath}`);
    const cleanedContent = this.removeComments(content);
    const sections = this.splitIntoSections(cleanedContent);
    return this.parseRequests(sections);
  }

  private removeComments(content: string): string {
    return content.split('\n').filter(line => {
      const trimmedLine = line.trim();
      return !trimmedLine.startsWith('#') || trimmedLine.startsWith('###') || trimmedLine.startsWith('####');
    }).join('\n');
  }

  private splitIntoSections(content: string): string[] {
    return content.split(/(?=^###\s)/m).filter(section => section.trim() !== '');
  }

  private parseRequests(sections: string[]): HttpRequest[] {
    const requestParser = new HttpRequestParser(this.variableManager);
    const requests: HttpRequest[] = [];

    for (const section of sections) {
      if (section.startsWith('@')) {
        this.handleGlobalVariables(section);
      } else {
        const request = requestParser.parse(section);
        requests.push(request);
      }
    }

    logVerbose(`Total parsed requests: ${requests.length}`);
    return requests;
  }

  private handleGlobalVariables(section: string): void {
    const lines = section.split('\n');
    for (const line of lines) {
      if (line.startsWith('@')) {
        const [key, value] = line.slice(1).split('=').map(s => s.trim());
        this.variableManager.setVariable(key, value);
        logVerbose(`Set global variable: ${key} = ${value}`);
      }
    }
  }
}
