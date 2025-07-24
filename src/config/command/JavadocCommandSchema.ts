import { type InferOutput , array, object, undefined, union } from 'valibot';
import { CommandOptionSchema } from '../../discord/command/CommandOptionSchema.js';
import { CommandSchema } from '../../discord/command/CommandSchema.js';
import { JavadocCommandOriginSchema } from './origin/JavadocCommandOriginSchema.js';

const JavadocParentCommandSchema = object({
  ...CommandSchema.entries,
  subcommands: array(
    object({
      ...CommandOptionSchema.entries,
      ...JavadocCommandOriginSchema.entries,
    }),
  ),
  url: undefined(
    'A javadoc command must have either subcommands or a url, not both',
  ),
});

export type JavadocParentCommandSchemaOutput = InferOutput<
  typeof JavadocParentCommandSchema
>;

export const JavadocStandaloneCommandSchema = object({
  ...CommandSchema.entries,
  ...JavadocCommandOriginSchema.entries,
  subcommands: undefined(
    'A javadoc command must have either subcommands or a url, not both',
  ),
});

export const JavadocCommandSchema = union([
  JavadocParentCommandSchema,
  JavadocStandaloneCommandSchema,
]);

export type JavadocCommandSchemaOutput = InferOutput<
  typeof JavadocCommandSchema
>;

export function isJavadocCommandWithSubcommands(
  command: JavadocCommandSchemaOutput,
): command is JavadocParentCommandSchemaOutput {
  return typeof command['subcommands'] !== 'undefined';
}
