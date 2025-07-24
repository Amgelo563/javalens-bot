export class DoesntExistFileError extends Error {
  constructor(path: string, options?: ErrorOptions) {
    super(`File at path "${path}" doesn't exist.`, options);
    this.name = this.constructor.name;
  }
}
