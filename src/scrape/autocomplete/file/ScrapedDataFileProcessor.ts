import { ValibotJSONFileProcessor } from '../../../file/processor/processors/ValibotJSONFileProcessor.js';
import { AutocompleteDataSchema } from '../schema/AutocompleteDataSchemaOutput.js';

export class ScrapedDataFileProcessor extends ValibotJSONFileProcessor<
  typeof AutocompleteDataSchema
> {
  constructor(path: string) {
    super({ schema: AutocompleteDataSchema, path });
  }
}
