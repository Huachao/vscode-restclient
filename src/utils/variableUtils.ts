import { Variables } from "../types";
import { logVerbose } from "./logger";

export function replaceVariablesInString(
  content: string,
  variables: Variables
): string {
  return content.replace(/\{\{(.+?)\}\}/g, (_, key) => {
    const trimmedKey = key.trim();
    const value = variables[trimmedKey];
    logVerbose(`Replacing variable: {{${trimmedKey}}} with ${value}`);
    return value !== undefined ? String(value) : `{{${trimmedKey}}}`;
  });
}