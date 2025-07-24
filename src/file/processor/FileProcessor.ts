import { err, ok, type Result } from 'neverthrow';
import type { FileWriteError } from '../io/errors/IOError.js';
import type { FileIO } from '../io/FileIO.js';
import { ValidationError } from '../validation/errors/ValidationError.js';
import type { Validator } from '../validation/Validator.js';

/** An object that reads from a file and validates it matches a given schema */
export class FileProcessor<SchemaOutput> {
  protected readonly io: FileIO;

  protected readonly validator: Validator<SchemaOutput>;

  protected cache: Result<SchemaOutput, any> | null = null;

  constructor(options: { io: FileIO; validator: Validator<SchemaOutput> }) {
    const { io, validator } = options;
    this.io = io;
    this.validator = validator;
  }

  public async read(options: {
    path: string;
    force?: boolean;
  }): Promise<Result<SchemaOutput, FileWriteError | ValidationError>> {
    const { path, force = false } = options;

    if (!force && this.cache) {
      return this.cache;
    }

    const result = await this.io.read(path);
    if (result.isErr()) {
      return err(result.error);
    }

    const data = result.value;

    return this.validator.validate(data).match(
      (value) => ok(value),
      (error) => err(new ValidationError(path, error)),
    );
  }

  public async write(options: {
    data: SchemaOutput;
    path: string;
    force?: boolean;
  }): Promise<Result<void, FileWriteError>> {
    const { data, path, force = false } = options;
    return this.io.write({ data, path, overwriteIfPresent: force });
  }
}
