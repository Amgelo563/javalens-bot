import { type JavadocParentCommandSchemaOutput } from '../../../config/command/JavadocCommandSchema.js';
import { type ParentJavadocCommand } from '../../../javadoc/command/ParentJavadocCommand.js';
import { type ScrapedJavadoc } from '../../../javadoc/ScrapedJavadoc.js';
import { type DiscordSearcher } from '../DiscordSearcher.js';

export type SearchableParentJavadocCommand = ParentJavadocCommand & {
  subcommands: Record<
    string,
    {
      data: JavadocParentCommandSchemaOutput['subcommands'][number];
      javadoc: ScrapedJavadoc;
      searcher: DiscordSearcher;
    }
  >;
};
