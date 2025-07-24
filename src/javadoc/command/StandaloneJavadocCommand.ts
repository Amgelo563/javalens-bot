import type { CommandSchemaOutput } from '../../discord/command/CommandSchema.js';
import type { ScrapedJavadoc } from '../ScrapedJavadoc.js';

export type StandaloneJavadocCommand = {
  javadoc: ScrapedJavadoc;
  data: CommandSchemaOutput;
  type: 'standalone';
  id: string;
};
