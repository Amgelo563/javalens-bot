import type { APIApplicationCommandOptionChoice } from '@discordjs/core';
import { fuzzyFilter, type FuzzyFilterResult } from 'fuzzbunny';
import type { ConfigSchemaOutput } from '../../../config/schema/ConfigSchema.js';
import { CommandLimits } from '../../../discord/command/limits/CommandLimits.js';
import { fromMappingToEntityType } from '../../../javadoc/entity/EntityTypeMapping.js';
import {
  type BroadJavaEntityType,
  BroadJavaEntityTypeEnum,
} from '../../../javadoc/types/BroadJavaEntityType.js';
import type { AutocompleteDataSchemaOutput } from '../../../scrape/autocomplete/schema/AutocompleteDataSchemaOutput.js';
import { FixedSizeDeque } from '../../../structures/FixedSizeDeque.js';
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

  protected readonly lastHitDeque: FixedSizeDeque<
    APIApplicationCommandOptionChoice<string>
  >;

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
    this.lastHitDeque = new FixedSizeDeque<
      APIApplicationCommandOptionChoice<string>
    >({ maxSize: CommandLimits.Autocomplete.Amount });
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
    if (query.trim() === '') {
      const lastHit = this.lastHitDeque.getItems();
      const firstObjects = this.objects
        .slice(0, CommandLimits.Autocomplete.Amount - lastHit.length)
        .map((entry) =>
          this.entryToChoice(entry, BroadJavaEntityTypeEnum.Object),
        );
      return [...lastHit, ...firstObjects];
    }

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

    const members = this.fuzzyResultsToChoices(
      fuzzyResults,
      BroadJavaEntityTypeEnum.Member,
    );
    if (fuzzyResults.length === CommandLimits.Autocomplete.Amount) {
      return members;
    }

    const rawObjects = fuzzyFilter(this.objects, query, {
      fields: ['name'],
    }).slice(0, CommandLimits.Autocomplete.Amount - members.length);

    const objects = this.fuzzyResultsToChoices(
      rawObjects,
      BroadJavaEntityTypeEnum.Object,
    );

    return [...members, ...objects];
  }

  public searchPrioritizingObjects(
    query: string,
  ): APIApplicationCommandOptionChoice<string>[] {
    const fuzzyResults = fuzzyFilter(this.objects, query, {
      fields: ['name'],
    }).slice(0, CommandLimits.Autocomplete.Amount);

    const objects = this.fuzzyResultsToChoices(
      fuzzyResults,
      BroadJavaEntityTypeEnum.Object,
    );

    if (fuzzyResults.length >= CommandLimits.Autocomplete.Amount) {
      return objects;
    }

    const rawMembers = fuzzyFilter(this.members, query, {
      fields: ['name'],
    }).slice(0, CommandLimits.Autocomplete.Amount - objects.length);
    const members = this.fuzzyResultsToChoices(
      rawMembers,
      BroadJavaEntityTypeEnum.Member,
    );

    return [...objects, ...members];
  }

  public bump(customId: string, type: BroadJavaEntityType): void {
    // while this looks bad given the data size, it's not executed that often. could fix with a map<customId, index>
    // if there's actually a performance issue reported by someone
    const entry =
      type === BroadJavaEntityTypeEnum.Object
        ? this.objects.find((entry) => entry.customId === customId)
        : this.members.find((entry) => entry.customId === customId);
    if (!entry) {
      console.warn(
        `Bumping with customId ${customId} of type ${type} failed, not found.`,
      );
      return;
    }
    const choice = this.entryToChoice(entry, type);
    this.lastHitDeque.push(choice);
  }

  protected fuzzyResultsToChoices(
    results: FuzzyFilterResult<Entry>[],
    type: BroadJavaEntityType,
  ): APIApplicationCommandOptionChoice<string>[] {
    return results.map((result) => this.entryToChoice(result.item, type));
  }

  protected entryToChoice(
    entry: Entry,
    type: BroadJavaEntityType,
  ): APIApplicationCommandOptionChoice<string> {
    const data = this.data[type][entry.file];
    const name = data.m;
    const entityType = fromMappingToEntityType(data.t);

    return {
      name: `${this.prefixes.autocomplete[entityType]} ${name}`,
      value: entry.customId,
    };
  }
}
