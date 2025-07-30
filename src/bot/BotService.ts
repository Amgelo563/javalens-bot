import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  Client,
  GatewayDispatchEvents,
  InteractionType,
} from '@discordjs/core';
import { REST } from '@discordjs/rest';
import { WebSocketManager } from '@discordjs/ws';
import type { GlobalCommandOptionsSchemaOutput } from '../config/command/option/GlobalCommandOptionsSchema.js';
import type { ConfigSchemaOutput } from '../config/schema/ConfigSchema.js';
import type { AnyJavadocCommand } from '../javadoc/command/AnyJavadocCommand.js';
import type { LoggerLike } from '../log/LoggerLike.js';
import { UUIDBasedJavadocCustomIdCodec } from './customId/UUIDBasedJavadocCustomIdCodec.js';
import { BotCommandsDeployer } from './deploy/BotCommandsDeployer.js';
import { JavadocCommandExecutor } from './execute/JavadocCommandExecutor.js';
import { type DiscordSearcher } from './search/DiscordSearcher.js';
import { FuzzbunnyDiscordSearcher } from './search/searchers/FuzzbunnyDiscordSearcher.js';

type CommandData = {
  commands: AnyJavadocCommand[];
  globalOptions: GlobalCommandOptionsSchemaOutput;
};

export class BotService {
  protected readonly client: Client;

  protected readonly commands: Record<string, AnyJavadocCommand>;

  protected readonly executor: JavadocCommandExecutor;

  protected readonly logger: LoggerLike;

  protected readonly commandOptions: GlobalCommandOptionsSchemaOutput;

  protected readonly gateway: WebSocketManager;

  protected readonly searchers: Record<string, DiscordSearcher>;

  constructor(options: {
    client: Client;
    gateway: WebSocketManager;
    commandData: CommandData;
    executor: JavadocCommandExecutor;
    logger: LoggerLike;
    searchers: Record<string, DiscordSearcher>;
  }) {
    this.client = options.client;
    this.commands = options.commandData.commands.reduce(
      (record, command) => {
        record[command.data.name] = command;
        return record;
      },
      Object.create(null) as Record<string, AnyJavadocCommand>,
    );
    this.executor = options.executor;
    this.logger = options.logger;
    this.commandOptions = options.commandData.globalOptions;
    this.gateway = options.gateway;
    this.searchers = options.searchers;
  }

  public static create(options: {
    config: ConfigSchemaOutput;
    commands: AnyJavadocCommand[];
    logger: LoggerLike;
  }): BotService {
    const rest = new REST({ version: '10' }).setToken(options.config.token);
    const gateway = new WebSocketManager({
      token: options.config.token,
      intents: 0,
      rest,
    });
    const client = new Client({
      rest,
      gateway,
    });

    const codec = new UUIDBasedJavadocCustomIdCodec();
    const executor = new JavadocCommandExecutor({
      options: options.config.options,
      codec,
      prefixes: options.config.prefixes,
      logger: options.logger,
      messages: options.config.messages,
    });

    const searchers: Record<string, DiscordSearcher> = {};
    for (const command of options.commands) {
      switch (command.type) {
        case 'standalone': {
          const data = command.javadoc.getAutocompleteData();
          searchers[command.id] = FuzzbunnyDiscordSearcher.create({
            data,
            prefixes: options.config.prefixes,
            codec,
          });
          break;
        }
        case 'parent': {
          for (const subcommand of Object.values(command.subcommands)) {
            const data = subcommand.javadoc.getAutocompleteData();
            searchers[subcommand.id] = FuzzbunnyDiscordSearcher.create({
              data,
              prefixes: options.config.prefixes,
              codec,
            });
          }
          break;
        }
      }
    }

    return new BotService({
      client,
      commandData: {
        commands: options.commands,
        globalOptions: options.config.options,
      },
      executor,
      logger: options.logger,
      gateway,
      searchers,
    });
  }

  public async start() {
    this.listenToAutocompletes();
    this.listenToSlashCommands();

    const application = await this.client.api.applications.getCurrent();

    const deployer = new BotCommandsDeployer({
      commandOptions: this.commandOptions,
      client: this.client,
    });
    await deployer.deploy(this.commands, application.id);

    await this.gateway.connect();
  }

  protected listenToAutocompletes() {
    this.client.on(GatewayDispatchEvents.InteractionCreate, async (event) => {
      const { data: interaction } = event;
      if (interaction.type !== InteractionType.ApplicationCommandAutocomplete) {
        return;
      }

      const command = this.commands[interaction.data.name];
      if (!command) {
        this.logger.warn(
          'Received autocomplete interaction for unknown command:',
          interaction,
        );
        return;
      }

      switch (command.type) {
        case 'parent': {
          const selected = interaction.data.options[0];
          if (
            !selected
            || selected.type !== ApplicationCommandOptionType.Subcommand
          ) {
            this.logger.warn(
              'Received non subcommand autocomplete interaction for a command saved as parent:',
              interaction,
            );
            return;
          }

          const subcommand = command.subcommands[selected.name];
          if (!subcommand) {
            this.logger.warn(
              'Received unknown subcommand interaction for a command saved as parent:',
              interaction,
            );
            return;
          }

          const searcher = this.searchers[subcommand.id];
          if (!searcher) {
            this.logger.warn(
              'Received autocomplete interaction for a command with no searcher:',
              interaction,
            );
            return;
          }

          try {
            await this.executor.handleAutocomplete(
              searcher,
              selected.options ?? [],
              [event],
            );
          } catch (error) {
            this.logger.error(
              'There was an error handling autocomplete:',
              error,
            );
          }
          break;
        }

        case 'standalone': {
          const searcher = this.searchers[command.id];
          if (!searcher) {
            this.logger.warn(
              'Received autocomplete interaction for a command with no searcher:',
              interaction,
            );
            return;
          }

          try {
            await this.executor.handleAutocomplete(
              searcher,
              interaction.data.options ?? [],
              [event],
            );
          } catch (error) {
            this.logger.error(
              'There was an error handling autocomplete:',
              error,
            );
          }
          break;
        }
      }
    });
  }

  protected listenToSlashCommands() {
    this.client.on(GatewayDispatchEvents.InteractionCreate, async (event) => {
      const { data: interaction } = event;
      if (interaction.type !== InteractionType.ApplicationCommand) {
        return;
      }
      if (
        interaction.data.type !== ApplicationCommandType.ChatInput
        || !interaction.data.options
      ) {
        this.logger.warn(
          "Received command interaction that isn't a chat input:",
          interaction,
        );
        return;
      }

      const command = this.commands[interaction.data.name];
      if (!command) {
        this.logger.warn(
          'Received interaction for unknown command:',
          interaction,
        );
        return;
      }

      switch (command.type) {
        case 'parent': {
          const selected = interaction.data.options[0];
          if (
            !selected
            || selected.type !== ApplicationCommandOptionType.Subcommand
          ) {
            this.logger.warn(
              'Received non subcommand interaction for a command saved as parent:',
              interaction,
            );
            return;
          }

          const subcommand = command.subcommands[selected.name];
          if (!subcommand) {
            this.logger.warn(
              'Received unknown subcommand interaction for a command saved as parent:',
              interaction,
            );
            return;
          }

          try {
            await this.executor.handleChatInput(
              subcommand.javadoc,
              this.searchers[subcommand.id],
              selected.options ?? [],
              [event],
            );
          } catch (error) {
            this.logger.error('There was an error handling chat input:', error);
          }
          return;
        }

        case 'standalone': {
          try {
            await this.executor.handleChatInput(
              command.javadoc,
              this.searchers[command.id],
              interaction.data.options ?? [],
              [event],
            );
          } catch (error) {
            this.logger.error('There was an error handling chat input:', error);
          }
          return;
        }
      }
    });
  }
}
