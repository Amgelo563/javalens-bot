import type { Result } from 'neverthrow';
import type { GenericSchema, InferOutput } from 'valibot';
import type { FileReadError } from '../../io/errors/IOError.js';
import { HoconIO } from '../../io/ios/HoconIO.js';
import type { ValidationError } from '../../validation/errors/ValidationError.js';
import { ValibotValidator } from '../../validation/validators/ValibotValidator.js';
import { FileProcessor } from '../FileProcessor.js';

export class ValibotHoconFileProcessor<
  Schema extends GenericSchema,
> extends FileProcessor<InferOutput<GenericSchema>> {
  protected readonly path: string;

  constructor(options: { schema: Schema; path: string }) {
    const validator = new ValibotValidator(options.schema);
    super({ validator, io: HoconIO.Instance });

    this.path = options.path;
  }

  public override async read(options?: {
    force?: boolean;
  }): Promise<Result<InferOutput<Schema>, FileReadError | ValidationError>> {
    const { force = false } = options || {};
    return super.read({ path: this.path, force });
  }
}
