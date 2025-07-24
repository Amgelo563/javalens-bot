import { Locale } from '@discordjs/core';
import {
  type GenericSchema,
  object,
  optional,
  picklist,
  pipe,
  record,
  transform,
} from 'valibot';

const locales = Object.keys(Locale) as (keyof typeof Locale)[];

// Constructs a schema with a Locale record, with values of the given schema.
export function LocalizableSchema<T extends GenericSchema>(schema: T) {
  return object({
    locale: optional(
      record(
        pipe(
          picklist(
            locales,
            `Locale keys must be one of ${Object.keys(Locale).join(', ')}`,
          ),
          transform((key) => Locale[key]),
        ),
        schema,
      ),
    ),
  });
}
