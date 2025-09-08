import {
  type APIApplicationCommandInteractionDataBasicOption,
  type APIApplicationCommandInteractionDataOption,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  type GatewayDispatchEvents,
  InteractionType,
  type MappedEvents,
  MessageFlags,
  RESTJSONErrorCodes,
} from '@discordjs/core';
import { DiscordAPIError } from '@discordjs/rest';
import type { GlobalCommandOptionsSchemaOutput } from '../../config/command/option/GlobalCommandOptionsSchema.js';
import type { ConfigSchemaOutput } from '../../config/schema/ConfigSchema.js';
import { fromMappingToEntityType } from '../../javadoc/entity/EntityTypeMapping.js';
import type { ScrapedJavadoc } from '../../javadoc/ScrapedJavadoc.js';
import {
  BroadJavaEntityTypeEnum,
  getBroadJavaEntityType,
} from '../../javadoc/types/BroadJavaEntityType.js';
import type { LoggerLike } from '../../log/LoggerLike.js';
import type { JavadocCustomIdCodec } from '../customId/JavadocCustomIdCodec.js';
import { type DiscordSearcher } from '../search/DiscordSearcher.js';

export class JavadocCommandExecutor {
  protected readonly options: GlobalCommandOptionsSchemaOutput;

  protected readonly codec: JavadocCustomIdCodec;

  protected readonly prefixes: ConfigSchemaOutput['prefixes'];

  protected readonly messages: ConfigSchemaOutput['messages'];

  protected readonly logger: LoggerLike;

  constructor(options: {
    options: GlobalCommandOptionsSchemaOutput;
    codec: JavadocCustomIdCodec;
    prefixes: ConfigSchemaOutput['prefixes'];
    messages: ConfigSchemaOutput['messages'];
    logger: LoggerLike;
  }) {
    this.options = options.options;
    this.codec = options.codec;
    this.prefixes = options.prefixes;
    this.messages = options.messages;
    this.logger = options.logger;
  }

  // FIXME: too many parameters, consider refactoring or single object parameter
  public async handleChatInput(
    javadoc: ScrapedJavadoc,
    searcher: DiscordSearcher,
    options:
      | APIApplicationCommandInteractionDataBasicOption[]
      | APIApplicationCommandInteractionDataOption[],
    [event]: MappedEvents[typeof GatewayDispatchEvents.InteractionCreate],
  ): Promise<void> {
    const { data: interaction, api } = event;
    if (
      interaction.type !== InteractionType.ApplicationCommand
      || interaction.data.type !== ApplicationCommandType.ChatInput
    ) {
      this.logger.warn(
        'Received interaction that is not a chat input command:',
        interaction,
      );
    }

    const query = this.getStringOptionValue(this.options.query.name, options);
    if (query === null) {
      this.logger.warn(
        'Received chat input interaction with no query:',
        interaction,
      );
      return;
    }

    const input = this.codec.deserialize(query);
    if (!input) {
      return api.interactions.reply(interaction.id, interaction.token, {
        content: this.messages.invalidOption,
        flags: MessageFlags.Ephemeral,
      });
    }

    const ephemeral = this.getBooleanOptionValue(
      this.options.hide.name,
      options,
    );
    await api.interactions.defer(interaction.id, interaction.token, {
      flags: ephemeral ? MessageFlags.Ephemeral : undefined,
    });

    const entityType = fromMappingToEntityType(input.type);
    const broadType = getBroadJavaEntityType({ entityType });
    const messageResult =
      broadType === BroadJavaEntityTypeEnum.Member
        ? await javadoc.readMemberMessage(input.id)
        : await javadoc.readObjectMessage(input.id);

    if (messageResult.isErr()) {
      this.logger.warn(
        'Received chat input interaction with unknown or wrong id:',
        input,
        'Query: ',
        query,
      );
      await api.interactions.editReply(
        interaction.application_id,
        interaction.token,
        { content: this.messages.error },
      );
      setTimeout(async () => {
        await api.interactions
          .deleteReply(interaction.application_id, interaction.token)
          .catch(() => {});
      }, 3000);
      return;
    }

    const type = fromMappingToEntityType(input.type);

    try {
      await api.interactions.editReply(
        interaction.application_id,
        interaction.token,
        {
          content: `${this.prefixes.message[type]} ${messageResult.value}`,
        },
      );
    } catch (error) {
      if (this.isAutomodError(error)) {
        await api.interactions.editReply(
          interaction.application_id,
          interaction.token,
          { content: this.messages.automodBlock },
        );
        return;
      }

      await api.interactions.editReply(
        interaction.application_id,
        interaction.token,
        { content: this.messages.error },
      );
      throw error;
    }

    searcher.bump(query, broadType);
  }

  public async handleAutocomplete(
    searcher: DiscordSearcher,
    options:
      | APIApplicationCommandInteractionDataBasicOption[]
      | APIApplicationCommandInteractionDataOption[],
    [event]: MappedEvents[typeof GatewayDispatchEvents.InteractionCreate],
  ): Promise<void> {
    const { data: interaction, api } = event;
    if (interaction.type !== InteractionType.ApplicationCommandAutocomplete) {
      return;
    }

    const query = this.getStringOptionValue(this.options.query.name, options);
    if (query === null) {
      this.logger.warn(
        'Received autocomplete interaction with no query:',
        interaction,
      );
      return;
    }

    const choices = searcher.search(query);
    await api.interactions.createAutocompleteResponse(
      interaction.id,
      interaction.token,
      {
        choices,
      },
    );
  }

  protected getStringOptionValue(
    name: string,
    options:
      | APIApplicationCommandInteractionDataOption[]
      | APIApplicationCommandInteractionDataBasicOption[]
      | undefined,
  ): string | null {
    const option = options?.find((option) => option.name === name);
    if (!option || option.type !== ApplicationCommandOptionType.String) {
      return null;
    }
    return option.value;
  }

  protected getBooleanOptionValue(
    name: string,
    options:
      | APIApplicationCommandInteractionDataOption[]
      | APIApplicationCommandInteractionDataBasicOption[]
      | undefined,
  ): boolean | null {
    const option = options?.find((option) => option.name === name);
    if (!option || option.type !== ApplicationCommandOptionType.Boolean) {
      return null;
    }
    return option.value;
  }

  protected isAutomodError(error: unknown): boolean {
    return (
      error instanceof DiscordAPIError
      && (error.code
        === RESTJSONErrorCodes.MessageWasBlockedByAutomaticModeration
        || error.code === RESTJSONErrorCodes.MessageBlockedByHarmfulLinksFilter)
    );
  }
}
