export class ApiError extends Error {
  readonly status: number;
  readonly path: string;

  constructor(path: string, status: number, message?: string) {
    super(message ?? `API ${path} failed: ${status}`);
    this.name = "ApiError";
    this.path = path;
    this.status = status;
  }
}
