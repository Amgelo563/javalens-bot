export class FileSystemError extends Error {
  constructor(path: string, message: string, options?: ErrorOptions) {
    super(`Unknown file system error with file "${path}": ${message}`, options);
    this.name = this.constructor.name;
  }
}
