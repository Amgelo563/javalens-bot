export class AlreadyExistsFileWriteError extends Error {
  constructor(
    options: {
      path: string;
    } & ErrorOptions,
  ) {
    const { path } = options;

    super(
      `File at path "${path}" already exists. Use the force option to overwrite.`,
      options,
    );
    this.name = this.constructor.name;
  }
}
