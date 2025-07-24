import { err, ok, type Result } from 'neverthrow';
import {
  flatten,
  type GenericSchema,
  type InferOutput,
  safeParse,
  type SafeParseResult,
} from 'valibot';
import type { Validator } from '../Validator.js';

export class ValibotValidator<Schema extends GenericSchema>
  implements Validator<InferOutput<Schema>>
{
  protected readonly schema: Schema;

  constructor(schema: Schema) {
    this.schema = schema;
  }

  public validate(data: unknown): Result<InferOutput<Schema>, string> {
    const parse = safeParse(this.schema, data);
    if (!parse.success) {
      const message = this.extractMessage(parse);
      return err(message);
    }
    return ok(parse.output);
  }

  protected extractMessage(
    parsed: SafeParseResult<typeof this.schema> & { success: false },
  ): string {
    const flattened = flatten<typeof this.schema>(parsed.issues);
    return JSON.stringify(flattened, null, 2);
  }
}
