import { inlineCode } from '@discordjs/formatters';
import { EntityTypeEnum } from 'javadocs-scraper';
import {
  array,
  boolean,
  type InferOutput,
  minLength,
  number,
  object,
  optional,
  pipe,
  string,
  transform,
} from 'valibot';
import { JavadocCommandSchema } from '../command/JavadocCommandSchema.js';
import { GlobalCommandOptionsSchema } from '../command/option/GlobalCommandOptionsSchema.js';
import { DefaultConfigPrefix } from '../prefix/DefaultConfigPrefix.js';

export const ConfigSchema = object({
  token: string(),
  commands: pipe(
    array(JavadocCommandSchema),
    minLength(1, 'There needs to be at least one command.'),
  ),
  options: GlobalCommandOptionsSchema,

  debug: optional(boolean(), true),

  // sensible defaults from testing
  maxLength: optional(
    object({
      description: optional(number(), 500),
      extraPropertiesDescription: optional(number(), 100),
      deprecation: optional(number(), 350),
    }),
    {
      description: 500,
      extraPropertiesDescription: 150,
      deprecation: 350,
    },
  ),

  messages: pipe(
    optional(
      object({
        codeblockOmitted: optional(string(), '(Codeblock omitted for brevity)'),
        error: optional(
          string(),
          'An error occurred. Please try again, or contact a staff member if this keeps ocurring.',
        ),
        automodBlock: optional(
          string(),
          'My message was blocked by AutoMod. Please make sure I\'m a member, and I have the "Manage Server" permission.',
        ),
        invalidOption: optional(
          string(),
          'Invalid option. Please choose one from the autocomplete.',
        ),
      }),
      {},
    ),
    transform((messages) => ({
      codeblockOmitted:
        messages?.codeblockOmitted ?? '(Codeblock omitted for brevity)',
      error:
        messages?.error
        ?? 'An error occurred. Please try again, or contact a staff member if this keeps ocurring.',
      automodBlock:
        messages?.automodBlock
        ?? 'My message was blocked by AutoMod. Please make sure I\'m a member, and I have the "Manage Server" permission.',
      invalidOption:
        messages?.invalidOption
        ?? 'Invalid option. Please choose one from the autocomplete.',
    })),
  ),

  prefixes: pipe(
    optional(
      object({
        message: optional(
          object({
            [EntityTypeEnum.Class]: optional(string()),
            [EntityTypeEnum.Interface]: optional(string()),
            [EntityTypeEnum.Enum]: optional(string()),
            [EntityTypeEnum.EnumConstant]: optional(string()),
            [EntityTypeEnum.Method]: optional(string()),
            [EntityTypeEnum.Field]: optional(string()),
            [EntityTypeEnum.Annotation]: optional(string()),
            [EntityTypeEnum.AnnotationElement]: optional(string()),
          }),
        ),
        autocomplete: optional(
          object({
            [EntityTypeEnum.Class]: optional(string()),
            [EntityTypeEnum.Interface]: optional(string()),
            [EntityTypeEnum.Enum]: optional(string()),
            [EntityTypeEnum.EnumConstant]: optional(string()),
            [EntityTypeEnum.Method]: optional(string()),
            [EntityTypeEnum.Field]: optional(string()),
            [EntityTypeEnum.Annotation]: optional(string()),
            [EntityTypeEnum.AnnotationElement]: optional(string()),
          }),
        ),
      }),
      {},
    ),
    transform((prefixes) => {
      return {
        message: {
          [EntityTypeEnum.Class]:
            prefixes?.message?.[EntityTypeEnum.Class]
            ?? inlineCode(DefaultConfigPrefix[EntityTypeEnum.Class]),
          [EntityTypeEnum.Interface]:
            prefixes?.message?.[EntityTypeEnum.Interface]
            ?? inlineCode(DefaultConfigPrefix[EntityTypeEnum.Interface]),
          [EntityTypeEnum.Enum]:
            prefixes?.message?.[EntityTypeEnum.Enum]
            ?? inlineCode(DefaultConfigPrefix[EntityTypeEnum.Enum]),
          [EntityTypeEnum.EnumConstant]:
            prefixes?.message?.[EntityTypeEnum.EnumConstant]
            ?? inlineCode(DefaultConfigPrefix[EntityTypeEnum.EnumConstant]),
          [EntityTypeEnum.Method]:
            prefixes?.message?.[EntityTypeEnum.Method]
            ?? inlineCode(DefaultConfigPrefix[EntityTypeEnum.Method]),
          [EntityTypeEnum.Field]:
            prefixes?.message?.[EntityTypeEnum.Field]
            ?? inlineCode(DefaultConfigPrefix[EntityTypeEnum.Field]),
          [EntityTypeEnum.Annotation]:
            prefixes?.message?.[EntityTypeEnum.Annotation]
            ?? inlineCode(DefaultConfigPrefix[EntityTypeEnum.Annotation]),
          [EntityTypeEnum.AnnotationElement]:
            prefixes?.message?.[EntityTypeEnum.AnnotationElement]
            ?? inlineCode(
              DefaultConfigPrefix[EntityTypeEnum.AnnotationElement],
            ),
        },
        autocomplete: {
          [EntityTypeEnum.Class]:
            prefixes?.autocomplete?.[EntityTypeEnum.Class]
            ?? DefaultConfigPrefix[EntityTypeEnum.Class],
          [EntityTypeEnum.Interface]:
            prefixes?.autocomplete?.[EntityTypeEnum.Interface]
            ?? DefaultConfigPrefix[EntityTypeEnum.Interface],
          [EntityTypeEnum.Enum]:
            prefixes?.autocomplete?.[EntityTypeEnum.Enum]
            ?? DefaultConfigPrefix[EntityTypeEnum.Enum],
          [EntityTypeEnum.EnumConstant]:
            prefixes?.autocomplete?.[EntityTypeEnum.EnumConstant]
            ?? DefaultConfigPrefix[EntityTypeEnum.EnumConstant],
          [EntityTypeEnum.Method]:
            prefixes?.autocomplete?.[EntityTypeEnum.Method]
            ?? DefaultConfigPrefix[EntityTypeEnum.Method],
          [EntityTypeEnum.Field]:
            prefixes?.autocomplete?.[EntityTypeEnum.Field]
            ?? DefaultConfigPrefix[EntityTypeEnum.Field],
          [EntityTypeEnum.Annotation]:
            prefixes?.autocomplete?.[EntityTypeEnum.Annotation]
            ?? DefaultConfigPrefix[EntityTypeEnum.Annotation],
          [EntityTypeEnum.AnnotationElement]:
            prefixes?.autocomplete?.[EntityTypeEnum.AnnotationElement]
            ?? DefaultConfigPrefix[EntityTypeEnum.AnnotationElement],
        },
      };
    }),
  ),

  advanced: optional(
    object({
      global: object({
        maxWorkers: optional(number(), 2),
      }),
      perWorker: object({
        fileWritePoolSize: optional(number(), 3),
        resourceLimits: optional(
          object({
            maxYoungGenerationSizeMb: optional(number(), undefined),
            maxOldGenerationSizeMb: optional(number(), 1024),
            codeRangeSizeMb: optional(number(), 1024),
            stackSizeMb: optional(number(), undefined),
          }),
          {
            maxYoungGenerationSizeMb: undefined,
            maxOldGenerationSizeMb: 1024,
            codeRangeSizeMb: undefined,
            stackSizeMb: undefined,
          },
        ),
      }),
    }),
    {
      global: {
        maxWorkers: 2,
      },
      perWorker: {
        fileWritePoolSize: 3,
        resourceLimits: {
          maxYoungGenerationSizeMb: undefined,
          maxOldGenerationSizeMb: 1024,
          codeRangeSizeMb: undefined,
          stackSizeMb: undefined,
        },
      },
    },
  ),
});

export type ConfigSchemaOutput = InferOutput<typeof ConfigSchema>;
