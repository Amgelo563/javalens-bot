import { HoconIO } from '../../file/io/ios/HoconIO.js';
import { ValibotHoconFileProcessor } from '../../file/processor/processors/ValibotHoconFileProcessor.js';
import { ConfigSchema } from '../schema/ConfigSchema.js';

export class ConfigFileProcessor extends ValibotHoconFileProcessor<
  typeof ConfigSchema
> {
  constructor() {
    super({ schema: ConfigSchema, path: HoconIO.buildName('config') });
  }
}
