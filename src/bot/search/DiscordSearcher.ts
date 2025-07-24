import type { APIApplicationCommandOptionChoice } from '@discordjs/core';

export interface DiscordSearcher {
  search(query: string): APIApplicationCommandOptionChoice<string>[];
  searchPrioritizingMembers(
    query: string,
  ): APIApplicationCommandOptionChoice<string>[];
  searchPrioritizingObjects(
    query: string,
  ): APIApplicationCommandOptionChoice<string>[];
}
