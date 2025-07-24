export class SerializationFileWriteError extends Error {
  constructor(
    options: {
      input: unknown;
      format: string;
    } & ErrorOptions,
  ) {
    const { format, input } = options;

    super(
      `The input "${input}" couldn't be serialized to format "${format}".`,
      options,
    );
    this.name = this.constructor.name;
  }
}
