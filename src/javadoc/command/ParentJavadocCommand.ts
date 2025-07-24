import type { JavadocParentCommandSchemaOutput } from '../../config/command/JavadocCommandSchema.js';
import type { CommandSchemaOutput } from '../../discord/command/CommandSchema.js';
import type { ScrapedJavadoc } from '../ScrapedJavadoc.js';

export type ParentJavadocCommand = {
  data: CommandSchemaOutput;
  subcommands: Record<
    string,
    {
      data: JavadocParentCommandSchemaOutput['subcommands'][number];
      javadoc: ScrapedJavadoc;
      id: string;
    }
  >;
  type: 'parent';
};
