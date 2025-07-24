import {
  ApplicationIntegrationType,
  InteractionContextType,
} from '@discordjs/core';
import {
  array,
  check,
  type InferOutput,
  maxLength,
  minLength,
  nullable,
  object,
  optional,
  pick,
  picklist,
  pipe,
  regex,
  string,
  transform,
} from 'valibot';
import { LocalizableSchema } from '../locale/LocalizableSchema.js';
import { CommandOptionSchema } from './CommandOptionSchema.js';
import {
  type IntegrationTypeKey,
  IntegrationTypeKeys,
} from './contexts/IntegrationType.js';
import {
  type InteractionContextKey,
  InteractionContextKeys,
} from './contexts/InteractionContext.js';
import { CommandLimits } from './limits/CommandLimits.js';

const BaseCommandSchema = object({
  name: pipe(
    string(({ input }) => `Command name must be a string, input: ${input}`),
    regex(
      CommandLimits.NameRegex,
      ({ input }) =>
        `Command name must match regex: ${CommandLimits.NameRegex}, input: ${input}`,
    ),
    maxLength(
      CommandLimits.Name,
      `Command name must not exceed ${CommandLimits.Name} characters`,
    ),
  ),
  description: pipe(
    string(
      ({ input }) => `Command description must be a string, input: ${input}`,
    ),
    minLength(1, 'Command description must not be empty'),
    maxLength(
      CommandLimits.Description,
      `Command description must not exceed ${CommandLimits.Description} characters`,
    ),
  ),

  integrationTypes: pipe(
    optional(
      nullable(
        array(
          picklist(
            IntegrationTypeKeys,
            ({ input }) =>
              `Invalid integration type: ${input}. Must be one of: ${IntegrationTypeKeys.join(', ')}`,
          ),
          ({ input }) => `Invalid integration type array: ${input}`,
        ),
      ),
    ),
    transform((types) => {
      if (!types) return null;
      return Object.values(types).map(
        (k) => ApplicationIntegrationType[k as IntegrationTypeKey],
      );
    }),
    check((types) => {
      if (!types) return true;
      return types.length > 0;
    }, 'Specify at least one integrationTypes, or set it to false.'),
  ),

  interactionContexts: pipe(
    optional(
      nullable(
        array(
          picklist(
            InteractionContextKeys,
            ({ input }) =>
              `Invalid interaction context: ${input}. Must be one of: ${InteractionContextKeys.join(', ')}`,
          ),
          ({ input }) => `Invalid interaction context array: ${input}`,
        ),
      ),
    ),
    transform((contexts) => {
      if (!contexts) return null;
      return Object.values(contexts).map(
        (k) => InteractionContextType[k as InteractionContextKey],
      );
    }),
    check((types) => {
      if (!types) return true;
      return types.length > 0;
    }, 'Specify at least one interactionContexts, or set it to false.'),
  ),
});

export const CommandSchema = object({
  ...BaseCommandSchema.entries,
  ...LocalizableSchema(pick(BaseCommandSchema, ['name', 'description']))
    .entries,
});

export function CommandSchemaWithOptions<T extends string>(optionNames: T[]) {
  const options = {} as Record<T, typeof CommandOptionSchema>;

  for (const name of optionNames) {
    options[name] = CommandOptionSchema;
  }

  return object({
    ...CommandSchema.entries,
    options: object(options),
  });
}

export type CommandSchemaOutput<
  Options extends string | undefined = undefined,
> = InferOutput<
  Options extends string
    ? ReturnType<typeof CommandSchemaWithOptions<Options>>
    : typeof CommandSchema
>;
