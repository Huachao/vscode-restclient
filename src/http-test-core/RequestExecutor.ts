import fetch from 'node-fetch';
import { HttpRequest, HttpResponse } from "../types";
import { VariableManager } from "./VariableManager";
import { logVerbose, logError } from "../utils/logger";
import { URL } from "url";
import { RequestError } from "../errors/RequestError";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import https from "https";
import { JsonUtils } from "../utils/jsonUtils";

/**
 * Executes HTTP requests and processes responses.
 */
export class RequestExecutor {
  private serverCheckTimeout = 5000;
  private requestTimeout = 10000;
  private agent = new https.Agent({
    rejectUnauthorized: false,
  });

  /**
   * Creates an instance of RequestExecutor.
   * @param variableManager - The VariableManager instance to use.
   */
  constructor(
    private variableManager: VariableManager,
    private baseDir: string
  ) {}

  async execute(request: HttpRequest): Promise<HttpResponse> {
    const processedRequest = this.applyVariables(request);
    logVerbose(
      `Executing request: ${processedRequest.method} ${processedRequest.url}`
    );

    try {
      await this.validateUrl(processedRequest.url);
      await this.checkServerStatus(processedRequest.url);
      const response = await this.sendRequest(processedRequest);

      logVerbose("Full response:");
      logVerbose(`Status: ${response.status}`);
      logVerbose(
        `Headers: ${JSON.stringify(
          Object.fromEntries(response.headers.entries()),
          null,
          2
        )}`
      );

      const responseData = await response.text();
      const parsedData = JsonUtils.parseJson(responseData) || responseData;
      logVerbose(`Data: ${JSON.stringify(parsedData, null, 2)}`);

      return {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        data: parsedData
      };
    } catch (error) {
      return this.handleRequestError(error, processedRequest);
    }
  }

  private applyVariables(request: HttpRequest): HttpRequest {
    return {
      ...request,
      url: this.variableManager.replaceVariables(request.url),
      headers: Object.fromEntries(
        Object.entries(request.headers).map(([key, value]) => [
          key,
          this.variableManager.replaceVariables(value),
        ])
      ),
      body:
        typeof request.body === "string"
          ? this.variableManager.replaceVariables(request.body)
          : request.body,
    };
  }

  private async validateUrl(url: string): Promise<void> {
    try {
      new URL(url);
    } catch {
      throw new RequestError(`Invalid URL: ${url}`);
    }
  }

  private async checkServerStatus(url: string): Promise<void> {
    try {
      await fetch(url, {
        method: "HEAD",
        timeout: this.serverCheckTimeout,
        agent: this.agent,
      });
    } catch (error) {
      if (error instanceof Error && "type" in error && error.type === "request-timeout") {
        throw new RequestError(
          `Server is not responding at ${url}. Please check if the server is running.`
        );
      }
    }
  }

  private async sendRequest(request: HttpRequest) {
    const { method, url, headers, body } = request;

    let data: string | FormData | undefined = body as string;
    let requestHeaders = { ...headers };

    const contentType = headers["Content-Type"] || headers["content-type"];
    if (contentType) {
      if (contentType.includes("application/json")) {
        data = typeof body === "string" ? body : JSON.stringify(body);
      } else if (contentType.includes("multipart/form-data")) {
        const formData = this.parseFormData(headers, body as string);
        data = formData;

        delete requestHeaders["Content-Type"];
        delete requestHeaders["content-type"];
        requestHeaders = {
          ...requestHeaders,
          ...formData.getHeaders(),
        };
      }
    }

    logVerbose(`Sending request with config:`, {
      method,
      url,
      headers: requestHeaders,
      body: data instanceof FormData ? "[FormData]" : data,
    });

    return fetch(url, {
      method,
      headers: requestHeaders,
      body: data,
      agent: this.agent,
      timeout: this.requestTimeout,
    });
  }

  private parseFormData(
    headers: Record<string, string>,
    body: string
  ): FormData {
    const formData = new FormData();
    const contentType = headers["Content-Type"] || headers["content-type"];
    if (!contentType) {
      throw new Error("Content-Type header not found.");
    }
    const boundaryMatch = contentType.match(/boundary=(.+)$/);
    if (!boundaryMatch) {
      throw new Error("Boundary not found in Content-Type header.");
    }
    const boundary = boundaryMatch[1].trim();

    const parts = body.split(new RegExp(`--${boundary}`));
    parts.forEach((part) => {
      if (part.trim().length === 0 || part == "--") return;

      this.buildFormData(formData, part);
    });

    return formData;
  }

  private buildFormData(formData: FormData, part: string) {
    const lines = part.split("\r\n");
    const headers: Record<string, string> = {};
    let name: string | null = null;
    let filename: string | null = null;
    let contentType: string | null = null;
    let content: string | null = null;

    lines.forEach((line) => {
      if (line.trim().length === 0) return;

      const headerMatch = line.match(/(.+?): (.+)/);
      if (headerMatch) {
        headers[headerMatch[1].toLowerCase()] = headerMatch[2];
      } else {
        if (content == null) {
          content = line;
        } else {
          content += "\r\n" + line;
        }
      }
    });

    const contentDisposition = headers["content-disposition"];
    if (contentDisposition) {
      const match = contentDisposition.match(/name="(.+?)"/);
      if (match) {
        name = match[1];
      }
      const filenameMatch = contentDisposition.match(/filename="(.+?)"/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }

    const contentTypeHeader = headers["content-type"];
    if (contentTypeHeader) {
      contentType = contentTypeHeader;
    }

    if (!name) {
      throw new Error("Name not found in Content-Disposition header.");
    }

    let options: {
      filename?: string;
      contentType?: string;
    } = {};
    if (filename) {
      options.filename = filename;
    }
    if (contentType) {
      options.contentType = contentType;
    }

    if (filename && content) {
      const [, filePath] = (content as string).split(" ");

      if (filePath) {
        const absoluteFilePath = path.resolve(this.baseDir, filePath);
        if (!fs.existsSync(absoluteFilePath)) {
          throw new Error(filePath + " is not found.");
        }

        formData.append(name, fs.createReadStream(absoluteFilePath), options);
      } else {
        throw new Error("Invalid file path format.");
      }
    } else {
      const value = content!;
      formData.append(name, value, options);
    }
  }

  private async handleRequestError(
    error: unknown,
    request: HttpRequest
  ): Promise<HttpResponse> {
    if (error instanceof Error) {
      if ("type" in error && error.type === "request-timeout") {
        await logError(`Request timeout: ${error.message}`);
        throw new RequestError(
          `Request to ${request.url} timed out. Please check your network connection and server status.`
        );
      }
      if ("response" in error) {
        const response = (error as any).response;
        await logError(`Request failed with status ${response.status}: ${error.message}`);
        return {
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          data: await response.text()
        };
      }
    }

    logError(
      `Request failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    throw new RequestError(
      `Request to ${request.url} failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
