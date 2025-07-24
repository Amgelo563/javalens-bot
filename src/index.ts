import { Logger } from 'tslog';
import { BotService } from './bot/BotService.js';
import { ConfigFileProcessor } from './config/file/ConfigFileProcessor.js';
import { ScrapeService } from './scrape/ScrapeService.js';

const logger = new Logger({
  type: 'pretty',
  prettyLogTemplate:
    '{{dateIsoStr}}\t{{logLevelName}}\t{{fileNameWithLine}}{{nameWithDelimiterPrefix}}\t',
});
logger.info('Starting');

logger.info('Reading config...');
const configProcessor = new ConfigFileProcessor();
const result = await configProcessor.read();
if (result.isErr()) {
  logger.error(result.error);
  process.exit(1);
}
const config = result.value;
logger.info('Config read successfully');

if (!config.debug) {
  logger.info('Switching to non debug format as per config');
  // > tslog comes with default log level 0: silly, 1: trace, 2: debug, 3: info, 4: warn, 5: error, 6: fatal.
  // https://www.npmjs.com/package/tslog
  logger.settings.minLevel = 3;
  logger.settings.prettyLogTemplate =
    '{{dateIsoStr}}\t{{logLevelName}}\t{{nameWithDelimiterPrefix}}\t';
}

logger.info('Starting scrape service...');
const scrapeService = ScrapeService.create({
  config,
  logger,
  root: process.cwd(),
});
const commands = await scrapeService.start();
logger.info('Scrape service finished');

logger.info('Starting bot service...');
const botService = BotService.create({
  config,
  commands,
  logger,
});
await botService.start();
logger.info('Bot started!');
