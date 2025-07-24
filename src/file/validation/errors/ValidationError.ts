export class ValidationError extends Error {
  constructor(input: string, error: string, options?: ErrorOptions) {
    super(`Error validating "${input}": ${error}`, options);
    this.name = this.constructor.name;
  }
}
