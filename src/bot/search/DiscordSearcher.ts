import type { APIApplicationCommandOptionChoice } from '@discordjs/core';
import { type BroadJavaEntityType } from '../../javadoc/types/BroadJavaEntityType.js';

export interface DiscordSearcher {
  search(query: string): APIApplicationCommandOptionChoice<string>[];
  searchPrioritizingMembers(
    query: string,
  ): APIApplicationCommandOptionChoice<string>[];
  searchPrioritizingObjects(
    query: string,
  ): APIApplicationCommandOptionChoice<string>[];
  bump(customId: string, type: BroadJavaEntityType): void;
}
