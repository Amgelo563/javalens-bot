import type { JavadocCommandOriginSchemaOutput } from '../../config/command/origin/JavadocCommandOriginSchema.js';
import type { ScrapedMessagesPathBuilder } from '../messages/ScrapedMessagesPathBuilder.js';

export interface ScrapeWorkerPool {
  queue(
    origin: JavadocCommandOriginSchemaOutput,
    pathBuilder: ScrapedMessagesPathBuilder,
  ): Promise<string | undefined>;
}
