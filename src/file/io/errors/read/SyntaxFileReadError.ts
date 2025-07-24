export class SyntaxFileReadError extends Error {
  constructor(
    options: {
      path: string;
      message: string;
      format: string;
    } & ErrorOptions,
  ) {
    const { path, format, message } = options;

    super(
      `${format} syntax error while reading "${path}": ${message}`,
      options,
    );
    this.name = this.constructor.name;
  }
}
