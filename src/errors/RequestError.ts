/**
 * Represents an error that occurs during HTTP request execution.
 */
export class RequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RequestError";
  }
}
