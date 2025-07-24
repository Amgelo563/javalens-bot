import { type InferOutput , object } from 'valibot';
import { CommandOptionSchema } from '../../../discord/command/CommandOptionSchema.js';

export const GlobalCommandOptionsSchema = object({
  query: CommandOptionSchema,
  hide: CommandOptionSchema,
});

export type GlobalCommandOptionsSchemaOutput = InferOutput<
  typeof GlobalCommandOptionsSchema
>;
