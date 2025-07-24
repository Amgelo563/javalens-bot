import {
  type APIApplicationCommandBasicOption,
  type APIApplicationCommandStringOption,
  type APIApplicationCommandSubcommandOption,
  ApplicationCommandOptionType,
  type Client,
  type Locale,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from '@discordjs/core';
import type { GlobalCommandOptionsSchemaOutput } from '../../config/command/option/GlobalCommandOptionsSchema.js';
import { type CommandOptionSchemaOutput } from '../../discord/command/CommandOptionSchema.js';
import { type CommandSchemaOutput } from '../../discord/command/CommandSchema.js';
import type { AnyJavadocCommand } from '../../javadoc/command/AnyJavadocCommand.js';

type APISerializableBasicSchemaOption = CommandOptionSchemaOutput & {
  required: boolean;
  type: APIApplicationCommandBasicOption['type'];
};

export class BotCommandsDeployer {
  protected readonly commandOptions: GlobalCommandOptionsSchemaOutput;

  protected readonly client: Client;

  constructor(options: {
    commandOptions: GlobalCommandOptionsSchemaOutput;
    client: Client;
  }) {
    this.commandOptions = options.commandOptions;
    this.client = options.client;
  }

  public async deploy(
    commands: Record<string, AnyJavadocCommand>,
    applicationId: string,
  ): Promise<void> {
    const options: APIApplicationCommandBasicOption[] = [];

    const queryOption = this.toBasicAPIOption({
      ...this.commandOptions.query,
      required: true,
      type: ApplicationCommandOptionType.String,
    }) as Omit<APIApplicationCommandStringOption, 'choices'>;
    options.push({
      ...queryOption,
      autocomplete: true,
    });

    options.push(
      this.toBasicAPIOption({
        ...this.commandOptions.hide,
        required: false,
        type: ApplicationCommandOptionType.Boolean,
      }),
    );

    const commandDatas = Object.values(commands).map((command) => {
      const apiData = this.toAPICommand(command.data);
      switch (command.type) {
        case 'parent': {
          const subcommands = Array.from(
            Object.values(command.subcommands),
          ).map((sub) => ({
            ...sub.data,
            type: ApplicationCommandOptionType.Subcommand,
          }));

          apiData.options = subcommands
            .map(this.toSubcommandAPIOption.bind(this))
            .map((subcommand) => ({ ...subcommand, options }));
          break;
        }
        case 'standalone': {
          apiData.options = options;
          break;
        }
      }

      return apiData;
    });

    await this.client.api.applicationCommands.bulkOverwriteGlobalCommands(
      applicationId,
      commandDatas,
    );
  }

  protected toBasicAPIOption(
    option: APISerializableBasicSchemaOption,
  ): APIApplicationCommandBasicOption {
    const localizations = this.toAPILocaleOptions(option.locale);

    return {
      name: option.name,
      description: option.description,
      type: option.type,
      required: option.required,
      ...localizations,
    } as APIApplicationCommandBasicOption;
  }

  protected toSubcommandAPIOption(
    subcommand: CommandOptionSchemaOutput,
  ): APIApplicationCommandSubcommandOption {
    const localizations = this.toAPILocaleOptions(subcommand.locale);

    return {
      name: subcommand.name,
      description: subcommand.description,
      ...localizations,
      type: ApplicationCommandOptionType.Subcommand,
    };
  }

  protected toAPILocaleOptions(
    schema: CommandSchemaOutput['locale'] | CommandOptionSchemaOutput['locale'],
  ): Pick<
    RESTPostAPIChatInputApplicationCommandsJSONBody,
    'name_localizations' | 'description_localizations'
  > {
    const nameLocalizations: Record<Locale, string> = Object.create(null);
    const descriptionLocalizations: Record<Locale, string> =
      Object.create(null);

    for (const [name, options] of Object.entries(schema ?? {})) {
      if (!options) continue;

      nameLocalizations[name as Locale] = options.name;
      descriptionLocalizations[name as Locale] = options.description;
    }

    return {
      name_localizations: nameLocalizations,
      description_localizations: descriptionLocalizations,
    };
  }

  protected toAPICommand(
    command: CommandSchemaOutput,
  ): RESTPostAPIChatInputApplicationCommandsJSONBody {
    const localizations = this.toAPILocaleOptions(command.locale);

    return {
      name: command.name,
      description: command.description,
      integration_types: command.integrationTypes ?? undefined,
      contexts: command.interactionContexts ?? undefined,
      ...localizations,
    };
  }
}
