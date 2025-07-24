import { BroadcastChannel } from 'node:worker_threads';
import { Piscina } from 'piscina';
import type { JavadocCommandOriginSchemaOutput } from '../../../config/command/origin/JavadocCommandOriginSchema.js';
import type { ConfigSchemaOutput } from '../../../config/schema/ConfigSchema.js';
import type { LoggerLike } from '../../../log/LoggerLike.js';
import type { ScrapeJobScriptDataSchemaOutput } from '../../job/script/data/ScrapeJobScriptDataSchema.js';
import type { ScrapedMessagesPathBuilder } from '../../messages/ScrapedMessagesPathBuilder.js';
import { ScrapeWorkerChannels } from '../ScrapeWorkerChannels.js';
import type { ScrapeWorkerPool } from '../ScrapeWorkerPool.js';

export class PiscinaScrapeWorkerPool implements ScrapeWorkerPool {
  protected readonly config: ConfigSchemaOutput;

  protected readonly pool: Piscina;

  constructor(config: ConfigSchemaOutput, pool: Piscina) {
    this.config = config;
    this.pool = pool;
  }

  public static create(options: {
    config: ConfigSchemaOutput;
    scriptPath: string;
    logger: LoggerLike;
  }): PiscinaScrapeWorkerPool {
    const pool = new Piscina({
      filename: options.scriptPath,
      maxThreads: options.config.advanced.global.maxWorkers,
      resourceLimits: options.config.advanced.perWorker.resourceLimits,
    });

    const logChannel = new BroadcastChannel(ScrapeWorkerChannels.Logs);
    logChannel.onmessage = (event) => {
      if (!event || typeof event !== 'object' || !('data' in event)) return;
      options.logger.debug(event.data);
    };

    return new PiscinaScrapeWorkerPool(options.config, pool);
  }

  public async queue(
    origin: JavadocCommandOriginSchemaOutput,
    pathBuilder: ScrapedMessagesPathBuilder,
  ): Promise<string | undefined> {
    const data: ScrapeJobScriptDataSchemaOutput = {
      rootPath: pathBuilder.getProjectRoot(),
      folderName: pathBuilder.getJavadocFolderName(),
      config: this.config,
      origin: origin,
    };
    return this.pool.run(data);
  }
}
