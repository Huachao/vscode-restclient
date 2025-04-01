import vm from "vm";
import { readFile } from "../utils/fileUtils";
import { HttpResponse, CustomValidatorContext } from "../types";
import path from "path";
import fs from "fs";
import http from "http";

export async function loadCustomValidator(
  functionPath: string
): Promise<(response: HttpResponse, context: CustomValidatorContext) => void> {
  const script = await readFile(functionPath);
  
  const sandbox = {
    module: { exports: {} },
    async import(moduleName: string) {
      if (['path', 'fs', 'http'].includes(moduleName)) {
        switch (moduleName) {
          case 'path':
            return path;
          case 'fs':
            return fs;
          case 'http':
            return http;
        }
      }
      throw new Error(`Module ${moduleName} is not allowed`);
    },
    console,
  };

  vm.createContext(sandbox);
  await vm.runInContext(`
    (async () => {
      ${script}
    })();
  `, sandbox);

  if (typeof sandbox.module.exports !== "function") {
    throw new Error("Custom validator must export a function");
  }

  return sandbox.module.exports as (
    response: HttpResponse,
    context: CustomValidatorContext
  ) => void;
}