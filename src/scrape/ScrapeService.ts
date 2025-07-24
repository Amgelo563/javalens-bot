import { mkdir, readdir, rm } from 'node:fs/promises';
import { join as pathJoin } from 'node:path';
import { isJavadocCommandWithSubcommands } from '../config/command/JavadocCommandSchema.js';
import type { JavadocCommandOriginSchemaOutput } from '../config/command/origin/JavadocCommandOriginSchema.js';
import { type ConfigSchemaOutput } from '../config/schema/ConfigSchema.js';
import { DoesntExistFileError } from '../file/io/errors/generic/DoesntExistFileError.js';
import type { AnyJavadocCommand } from '../javadoc/command/AnyJavadocCommand.js';
import type { ParentJavadocCommand } from '../javadoc/command/ParentJavadocCommand.js';
import type { StandaloneJavadocCommand } from '../javadoc/command/StandaloneJavadocCommand.js';
import { ScrapedJavadoc } from '../javadoc/ScrapedJavadoc.js';
import type { LoggerLike } from '../log/LoggerLike.js';
import { ScrapedDataFileProcessor } from './autocomplete/file/ScrapedDataFileProcessor.js';
import type { AutocompleteDataSchemaOutput } from './autocomplete/schema/AutocompleteDataSchemaOutput.js';
import { ScrapedMessagesPathBuilder } from './messages/ScrapedMessagesPathBuilder.js';
import { PiscinaScrapeWorkerPool } from './pool/pools/PiscinaScrapeWorkerPool.js';
import type { ScrapeWorkerPool } from './pool/ScrapeWorkerPool.js';

type OriginFileMapping = {
  origin: JavadocCommandOriginSchemaOutput;
  pathBuilder: ScrapedMessagesPathBuilder;
  commandName: string;
  subcommandName: string | null;
};

type OriginFileMappingWithAutocomplete = OriginFileMapping & {
  autocomplete: AutocompleteDataSchemaOutput | null;
};

export class ScrapeService {
  protected readonly config: ConfigSchemaOutput;

  protected readonly logger: LoggerLike;

  protected readonly pool: ScrapeWorkerPool;

  protected readonly root: string;

  constructor(options: {
    config: ConfigSchemaOutput;
    logger: LoggerLike;
    pool: ScrapeWorkerPool;
    root: string;
  }) {
    const { config, logger, pool, root } = options;
    this.config = config;
    this.logger = logger;
    this.pool = pool;
    this.root = root;
  }

  public static create(options: {
    config: ConfigSchemaOutput;
    logger: LoggerLike;
    root: string;
  }) {
    const scriptRelativePath = pathJoin('job', 'script', 'scrapeJobScript.js');
    const scriptPath = new URL(scriptRelativePath, import.meta.url).href;

    const pool = PiscinaScrapeWorkerPool.create({ ...options, scriptPath });

    return new ScrapeService({
      ...options,
      pool,
    });
  }

  public async start(): Promise<AnyJavadocCommand[]> {
    const { pending: pendingOriginsMap, all: allOrigins } =
      await this.processOrigins();

    const cacheFolderPath = ScrapedMessagesPathBuilder.getCacheRoot(this.root);
    await mkdir(cacheFolderPath, { recursive: true });

    const cacheFolderEntries = await readdir(cacheFolderPath, {
      withFileTypes: true,
    });
    const unhandledCacheEntries: Set<string> = new Set(
      cacheFolderEntries
        .map((dir) => dir.name)
        .filter(
          (name) =>
            !allOrigins.find(
              (origin) => origin.pathBuilder.getJavadocFolderName() === name,
            ),
        ),
    );

    await this.deleteUnhandledCacheEntries(unhandledCacheEntries);

    if (!pendingOriginsMap.length) {
      this.logger.info(
        'Finished checking data files, no pending/missing origins. Wrapping up!',
      );
      return this.wrapMappings(allOrigins);
    }

    const pendingOriginsArray = Array.from(pendingOriginsMap.values());
    const pendingTitles = pendingOriginsArray
      .map((mapping) => `"${mapping.origin.title}"`)
      .join(', ');
    this.logger.info(
      `Finished checking data files, scraping ${pendingOriginsMap.length} pending origins: ${pendingTitles}. Will scrape at most ${this.config.advanced.global.maxWorkers} at a time. This may take a while!`,
    );

    let processed = 0;
    const promises = pendingOriginsArray.map(async (mapping) => {
      const { origin, pathBuilder } = mapping;

      const result = await this.pool.queue(origin, pathBuilder);
      if (typeof result === 'string') {
        this.logger.error(
          `Error while scraping "${origin.title}", it will be re-scraped on next run. Exiting!`,
          result,
        );
        process.exit(1);
      }

      processed++;
      this.logger.info(
        `Done with "${origin.title}" (${processed}/${pendingOriginsMap.length})`,
      );

      return mapping;
    });

    await Promise.all(promises);
    this.logger.info('Finished scraping all pending origins. Wrapping up!');

    return this.wrapMappings(allOrigins);
  }

  protected async processOrigins(): Promise<{
    pending: OriginFileMapping[];
    all: OriginFileMappingWithAutocomplete[];
  }> {
    const all: OriginFileMappingWithAutocomplete[] = [];
    const pending: OriginFileMapping[] = [];

    for (const commandData of this.config.commands) {
      const isSubcommand = isJavadocCommandWithSubcommands(commandData);

      const mappings: OriginFileMapping[] = [];
      if (isSubcommand) {
        const subcommandMappings = commandData.subcommands.map((origin) => {
          const pathBuilder =
            ScrapedMessagesPathBuilder.createSubcommandBuilder(
              this.root,
              commandData.name,
              origin.name,
            );

          return {
            origin,
            pathBuilder,
            commandName: commandData.name,
            subcommandName: origin.name,
          };
        });
        mappings.push(...subcommandMappings);
      } else {
        const pathBuilder = ScrapedMessagesPathBuilder.createCommandBuilder(
          this.root,
          commandData.name,
        );

        mappings.push({
          origin: commandData,
          pathBuilder,
          commandName: commandData.name,
          subcommandName: null,
        });
      }

      for (const mapping of mappings) {
        const { origin, pathBuilder } = mapping;

        const dataPath = pathBuilder.getDataFilePath();
        const fileProcessor = new ScrapedDataFileProcessor(dataPath);
        const fileResult = await fileProcessor.read();

        if (fileResult.isErr()) {
          if (fileResult.error instanceof DoesntExistFileError) {
            this.logger.debug(
              `Data file for "${origin.title}" doesn't exist, marking for scrape`,
            );
            pending.push(mapping);
            all.push({ ...mapping, autocomplete: null });
            continue;
          }

          this.logger.error(
            `Error while reading data file for "${origin.title}", marking for scrape: ${fileResult.error}`,
          );
          pending.push(mapping);
          all.push({ ...mapping, autocomplete: null });
          continue;
        }

        const date = fileResult.value.d;
        const now = Date.now();
        const cacheDays = origin.cacheDays;

        if (cacheDays > 0 && date + cacheDays * 24 * 60 * 60 * 1000 < now) {
          this.logger.debug(
            `Data file for "${origin.title}" is older than ${cacheDays} days, marking for scrape`,
          );
          pending.push(mapping);
          all.push({ ...mapping, autocomplete: fileResult.value });
          continue;
        }

        this.logger.debug(
          `Data file for "${origin.title}" is up to date, skipping scrape`,
        );
        all.push({ ...mapping, autocomplete: fileResult.value });
      }
    }

    return { pending, all };
  }

  protected async deleteUnhandledCacheEntries(
    folders: Set<string>,
  ): Promise<void> {
    if (!folders.size) {
      return;
    }

    this.logger.info(
      `Found extra entries inside cache folder, deleting: ${[...folders].map((folder) => `"${folder}"`).join(', ')}`,
    );

    const promises = [...folders].map(async (folder) => {
      const fullPath = pathJoin(
        ScrapedMessagesPathBuilder.getCacheRoot(this.root),
        folder,
      );
      await rm(fullPath, { recursive: true, force: true });
    });

    const results = await Promise.allSettled(promises);
    for (const result of results) {
      if (result.status === 'rejected') {
        this.logger.error(result);
      }
    }
  }

  protected async wrapMappings(
    mappings: OriginFileMappingWithAutocomplete[],
  ): Promise<AnyJavadocCommand[]> {
    const parentCommands: Record<string, ParentJavadocCommand> =
      Object.create(null);
    const standaloneCommands: StandaloneJavadocCommand[] = [];

    await Promise.all(
      mappings.map(async (mapping) => {
        const { pathBuilder, commandName, subcommandName } = mapping;

        const autocompleteDataProcessor = new ScrapedDataFileProcessor(
          pathBuilder.getDataFilePath(),
        );
        const autocompleteData = await autocompleteDataProcessor.read();
        if (autocompleteData.isErr()) {
          // should never happen
          this.logger.error(
            `Error while reading autocomplete data for "${commandName}"${
              subcommandName ? ` subcommand "${subcommandName}"` : ''
            }: ${autocompleteData.error}`,
          );
          return;
        }
        const javadoc = new ScrapedJavadoc(pathBuilder, autocompleteData.value);

        const storedCommand = this.config.commands.find(
          (command) => command.name === commandName,
        );
        if (!storedCommand) {
          // should never happen
          throw new Error(`Command "${commandName}" not found`);
        }

        if (subcommandName) {
          const subcommand = storedCommand?.subcommands?.find(
            (sub) => sub.name === subcommandName,
          );
          if (!subcommand) {
            // should never happen
            throw new Error(`Subcommand "${subcommandName}" not found`);
          }

          if (!parentCommands[commandName]) {
            parentCommands[commandName] = {
              data: storedCommand,
              type: 'parent',
              subcommands: {},
            };
          }
          parentCommands[commandName].subcommands[subcommandName] = {
            id: pathBuilder.getJavadocFolderName(),
            data: subcommand,
            javadoc,
          };
        } else {
          standaloneCommands.push({
            data: storedCommand,
            javadoc,
            id: pathBuilder.getJavadocFolderName(),
            type: 'standalone',
          });
        }
      }),
    );

    return [...Object.values(parentCommands), ...standaloneCommands];
  }
}
