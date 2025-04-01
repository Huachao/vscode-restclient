import { HttpResponse, VariableUpdate } from "../types";
import { VariableManager } from "./VariableManager";
import { JSONPath } from "jsonpath-plus";
import { logVerbose, logWarning } from "../utils/logger";

export class ResponseProcessor {
  constructor(private variableManager: VariableManager) {}

  async process(
    response: HttpResponse,
    variableUpdates: VariableUpdate[]
  ): Promise<void> {
    logVerbose(`Processing response with status ${response.status}`);
    await this.processVariableUpdates(variableUpdates, response);
  }

  private async processVariableUpdates(
    updates: VariableUpdate[],
    response: HttpResponse
  ): Promise<void> {
    let responseBody;
    if (response.data && typeof response.data === 'string' && response.data.trim() !== '') {
      try {
        responseBody = JSON.parse(response.data);
      } catch (error) {
        logWarning(`Failed to parse response data as JSON: ${error}`);
        responseBody = response.data;
      }
    } else {
      responseBody = response.data || {};
    }
  
    for (const update of updates) {
      let value: string | number | boolean;
      
      value = this.evaluateExpression(update.value, responseBody);
  
      if (typeof value === 'string' && !isNaN(Number(value))) {
        value = Number(value);
      }
  
      this.variableManager.setVariable(update.key, value);
      logVerbose(`Updated variable: ${update.key} = ${value}`);
    }
  }
  
  private evaluateExpression(expression: string, context: unknown): string | number | boolean {
    if (expression.startsWith('$.')) {
      // JSONPath
      return this.extractValueFromJsonPath(expression, context as string);
    } else if (expression.startsWith('{{') && expression.endsWith('}}')) {
      // Simple variable reference
      const varName = expression.slice(2, -2).trim();
      return this.variableManager.getVariable(varName) || '';
    } else if (expression.includes('{{')) {
      // String with embedded variables
      return this.variableManager.replaceVariables(expression);
    } else if (expression.toLowerCase() === 'true' || expression.toLowerCase() === 'false') {
      // Boolean
      return expression.toLowerCase() === 'true';
    } else if (expression.startsWith('"') && expression.endsWith('"')) {
      // Quoted string
      return expression.slice(1, -1);
    } else {
      // Treat as a plain string or number
      return isNaN(Number(expression)) ? expression : Number(expression);
    }
  }
  
  private extractValueFromJsonPath(jsonPath: string, json: string): string | number | boolean {
    const result = JSONPath({ path: jsonPath, json });
    if (!Array.isArray(result) || result.length === 0) {
      throw new Error(`JSONPath ${jsonPath} not found in response`);
    }
    return result[0];
  }
}
