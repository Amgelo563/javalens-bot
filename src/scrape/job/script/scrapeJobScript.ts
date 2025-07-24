import { parentPort } from 'node:worker_threads';
import { ScrapedMessagesPathBuilder } from '../../messages/ScrapedMessagesPathBuilder.js';
import { ScrapeJob } from '../ScrapeJob.js';
import type { ScrapeJobScriptDataSchemaOutput } from './data/ScrapeJobScriptDataSchema.js';

if (!parentPort) {
  throw new Error('parentPort is not defined. Is this running in a worker?');
}

export default async function main(data: ScrapeJobScriptDataSchemaOutput) {
  const job = ScrapeJob.create({
    origin: data.origin,
    pathBuilder: ScrapedMessagesPathBuilder.createCommandBuilder(
      data.rootPath,
      data.folderName,
    ),
    config: data.config,
  });

  const result = await job.run();

  if (result.isErr()) {
    return `${result.error.message}\n${result.error.stack}`;
  }
}
