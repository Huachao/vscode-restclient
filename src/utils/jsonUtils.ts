import JSON5 from 'json5';
import { logVerbose, logError } from './logger';

export class JsonUtils {
  static parseJson(body: string | undefined): object | undefined {
    if (!body) return undefined;
    
    // Remove any non-JSON content after the last closing brace
    const jsonEndIndex = body.lastIndexOf('}');
    if (jsonEndIndex !== -1) {
      body = body.substring(0, jsonEndIndex + 1);
    }
    
    body = body.trim();
  
    try {
      // First, try standard JSON parsing
      return JSON.parse(body);
    } catch (error) {
      logVerbose(`Standard JSON parse failed, attempting JSON5 parsing: ${error}`);
      
      try {
        // Try parsing with JSON5
        const parsed = JSON5.parse(body);
        logVerbose(`JSON5 parsing succeeded`);
        return parsed;
      } catch (json5Error) {
        logError(`Failed to parse JSON body even with JSON5: ${json5Error}`);
        logVerbose(`Raw body content: ${body}`);
        
        // If all else fails, try to salvage the JSON by removing trailing commas
        try {
          const withoutTrailingCommas = body.replace(/,\s*([\]}])/g, '$1');
          const salvaged = JSON5.parse(withoutTrailingCommas);
          logVerbose(`Salvaged JSON parsing succeeded`);
          return salvaged;
        } catch (salvageError) {
          logError(`Failed to salvage JSON: ${salvageError}`);
          return {};
        }
      }
    }
  }
}