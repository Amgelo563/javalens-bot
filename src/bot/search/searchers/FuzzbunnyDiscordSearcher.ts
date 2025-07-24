import type { APIApplicationCommandOptionChoice } from '@discordjs/core';
import { fuzzyFilter, type FuzzyFilterResult } from 'fuzzbunny';
import type { ConfigSchemaOutput } from '../../../config/schema/ConfigSchema.js';
import { CommandLimits } from '../../../discord/command/limits/CommandLimits.js';
import { fromMappingToEntityType } from '../../../javadoc/entity/EntityTypeMapping.js';
import type { AutocompleteDataSchemaOutput } from '../../../scrape/autocomplete/schema/AutocompleteDataSchemaOutput.js';
import { type JavadocCustomIdCodec } from '../../customId/JavadocCustomIdCodec.js';
import type { DiscordSearcher } from '../DiscordSearcher.js';

type Entry = {
  name: string;
  customId: string;
  file: string;
};

export class FuzzbunnyDiscordSearcher implements DiscordSearcher {
  protected static readonly MemberRegex = /[.#()]/g;

  protected readonly data: AutocompleteDataSchemaOutput;

  protected readonly members: Entry[];

  protected readonly objects: Entry[];

  protected readonly prefixes: ConfigSchemaOutput['prefixes'];

  constructor(options: {
    members: Entry[];
    objects: Entry[];
    data: AutocompleteDataSchemaOutput;
    prefixes: ConfigSchemaOutput['prefixes'];
  }) {
    this.members = options.members;
    this.objects = options.objects;
    this.data = options.data;
    this.prefixes = options.prefixes;
  }

  public static create(options: {
    data: AutocompleteDataSchemaOutput;
    prefixes: ConfigSchemaOutput['prefixes'];
    codec: JavadocCustomIdCodec;
  }): DiscordSearcher {
    const members = Object.entries(options.data.m).map(([file, member]) => ({
      name: member.n,
      file,
      customId: options.codec.serialize({ id: file, type: member.t }),
    }));
    const objects = Object.entries(options.data.o).map(([file, object]) => ({
      name: object.n,
      file,
      customId: options.codec.serialize({ id: file, type: object.t }),
    }));

    return new FuzzbunnyDiscordSearcher({
      members,
      objects,
      data: options.data,
      prefixes: options.prefixes,
    });
  }

  public search(query: string): APIApplicationCommandOptionChoice<string>[] {
    return ['.', '#', '('].some((char) => query.includes(char))
      ? this.searchPrioritizingMembers(query)
      : this.searchPrioritizingObjects(query);
  }

  public searchPrioritizingMembers(
    query: string,
  ): APIApplicationCommandOptionChoice<string>[] {
    const sanitizedQuery = query.replace(
      FuzzbunnyDiscordSearcher.MemberRegex,
      '',
    );
    const fuzzyResults = fuzzyFilter(this.members, sanitizedQuery, {
      fields: ['name'],
    }).slice(0, CommandLimits.Autocomplete.Amount);

    const members = this.toChoices(fuzzyResults, 'members');
    if (fuzzyResults.length === CommandLimits.Autocomplete.Amount) {
      return members;
    }

    const rawObjects = fuzzyFilter(this.objects, query, {
      fields: ['name'],
    }).slice(0, CommandLimits.Autocomplete.Amount - members.length);

    const objects = this.toChoices(rawObjects, 'objects');

    return [...members, ...objects];
  }

  public searchPrioritizingObjects(
    query: string,
  ): APIApplicationCommandOptionChoice<string>[] {
    const fuzzyResults = fuzzyFilter(this.objects, query, {
      fields: ['name'],
    }).slice(0, CommandLimits.Autocomplete.Amount);

    const objects = this.toChoices(fuzzyResults, 'objects');

    if (fuzzyResults.length >= CommandLimits.Autocomplete.Amount) {
      return objects;
    }

    const rawMembers = fuzzyFilter(this.members, query, {
      fields: ['name'],
    }).slice(0, CommandLimits.Autocomplete.Amount - objects.length);
    const members = this.toChoices(rawMembers, 'members');

    return [...objects, ...members];
  }

  protected toChoices(
    results: FuzzyFilterResult<Entry>[],
    type: 'members' | 'objects',
  ): APIApplicationCommandOptionChoice<string>[] {
    return results.map((result) => {
      const data = this.data[type === 'members' ? 'm' : 'o'][result.item.file];
      const name = data.m;
      const entityType = fromMappingToEntityType(data.t);

      return {
        name: `${this.prefixes.autocomplete[entityType]} ${name}`,
        value: result.item.customId,
      };
    });
  }
}
