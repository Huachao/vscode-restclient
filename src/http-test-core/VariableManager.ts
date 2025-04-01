import { Variables } from '../types';
import { logVerbose } from '../utils/logger';
import { replaceVariablesInString } from '../utils/variableUtils';

export class VariableManager {
  private variables: Variables = {};

  setVariables(variables: Variables): void {
    this.variables = { ...this.variables, ...variables };
  }

  replaceVariables(content: string): string {
    return replaceVariablesInString(content, this.variables);
  }

  setVariable(key: string, value: string | number | boolean): void {
    this.variables[key] = value;
    logVerbose(`Set variable: ${key} = ${value}`);
  }
  
  getVariable(key: string): string | number | boolean | undefined {
    return this.variables[key];
  }

  getAllVariables(): Variables {
    return this.variables;
  }
}
