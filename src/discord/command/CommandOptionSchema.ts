import {
  type InferOutput,
  maxLength,
  minLength,
  object,
  pipe,
  regex,
  string,
} from 'valibot';
import { LocalizableSchema } from '../locale/LocalizableSchema.js';
import { CommandLimits } from './limits/CommandLimits.js';

const BaseCommandOptionSchema = object({
  name: pipe(
    string(({ input }) => `Option name must be a string, input: ${input}`),
    minLength(1, 'Option name must not be empty'),
    regex(
      CommandLimits.NameRegex,
      ({ input }) =>
        `Option name must match regex: ${CommandLimits.NameRegex}, input: ${input}`,
    ),
    maxLength(
      CommandLimits.Option.Name,
      `Option name must not exceed ${CommandLimits.Option.Name} characters`,
    ),
  ),
  description: pipe(
    string(
      ({ input }) => `Option description must be a string, input: ${input}`,
    ),
    minLength(1, 'Option description must not be empty'),
    maxLength(
      CommandLimits.Option.Description,
      `Option description must not exceed ${CommandLimits.Option.Description} characters`,
    ),
  ),
});

export const CommandOptionSchema = object({
  ...BaseCommandOptionSchema.entries,
  ...LocalizableSchema(BaseCommandOptionSchema).entries,
});

export type CommandOptionSchemaOutput = InferOutput<typeof CommandOptionSchema>;
