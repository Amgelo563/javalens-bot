import type { StandaloneJavadocCommand } from '../../../javadoc/command/StandaloneJavadocCommand.js';
import { type DiscordSearcher } from '../DiscordSearcher.js';

export type SearchableStandaloneJavadocCommand = StandaloneJavadocCommand & {
  searcher: DiscordSearcher;
};
