import { type InferOutput , object, string } from 'valibot';
import { JavadocCommandOriginSchema } from '../../../../config/command/origin/JavadocCommandOriginSchema.js';
import { ConfigSchema } from '../../../../config/schema/ConfigSchema.js';

export const ScrapeJobScriptDataSchema = object({
  rootPath: string(),
  folderName: string(),
  config: ConfigSchema,
  origin: JavadocCommandOriginSchema,
});

export type ScrapeJobScriptDataSchemaOutput = InferOutput<
  typeof ScrapeJobScriptDataSchema
>;
