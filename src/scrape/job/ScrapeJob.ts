import { EntityTypeEnum, Scraper } from 'javadocs-scraper';
import { err, ok, type Result } from 'neverthrow';
import { once } from 'node:events';
import { rmSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { BroadcastChannel } from 'node:worker_threads';
import PromiseQueue from 'queue-promise';
import type { JavadocCommandOriginSchemaOutput } from '../../config/command/origin/JavadocCommandOriginSchema.js';
import { type ConfigSchemaOutput } from '../../config/schema/ConfigSchema.js';
import { AnyEntityTypeMappingEnum } from '../../javadoc/entity/EntityTypeMapping.js';
import type { AnyJavaMember } from '../../javadoc/types/AnyJavaMember.js';
import type { AnyJavaObject } from '../../javadoc/types/AnyJavaObject.js';
import type { AutocompleteDataSchemaOutput } from '../autocomplete/schema/AutocompleteDataSchemaOutput.js';
import { ScrapeFormatter } from '../format/ScrapeFormatter.js';
import type { ScrapedMessagesPathBuilder } from '../messages/ScrapedMessagesPathBuilder.js';
import { ScrapeWorkerChannels } from '../pool/ScrapeWorkerChannels.js';

type MessageData<Type extends 'object' | 'member'> =
  AutocompleteDataSchemaOutput[Type extends 'object' ? 'o' : 'm'];

export class ScrapeJob {
  protected static readonly FileUrlPrefix = 'file://';

  protected readonly fileWriteQueue: PromiseQueue;

  protected readonly origin: JavadocCommandOriginSchemaOutput;

  protected readonly formatter: ScrapeFormatter;

  protected readonly objectAutocompletions: MessageData<'object'> =
    Object.create(null);

  protected readonly memberAutocompletions: MessageData<'member'> =
    Object.create(null);

  protected readonly pathBuilder: ScrapedMessagesPathBuilder;

  constructor(options: {
    origin: JavadocCommandOriginSchemaOutput;
    fileWriteQueue: PromiseQueue;
    formatter: ScrapeFormatter;
    pathBuilder: ScrapedMessagesPathBuilder;
  }) {
    this.origin = options.origin;
    this.fileWriteQueue = options.fileWriteQueue;
    this.formatter = options.formatter;
    this.pathBuilder = options.pathBuilder;
  }

  public static create(
    options: Omit<
      ConstructorParameters<typeof ScrapeJob>[0],
      'fileWriteQueue' | 'formatter'
    > & {
      config: Pick<
        ConfigSchemaOutput,
        'prefixes' | 'maxLength' | 'advanced' | 'messages'
      >;
    },
  ): ScrapeJob {
    const fileWriteQueue = new PromiseQueue({
      concurrent: options.config.advanced.perWorker.fileWritePoolSize,
    });
    const formatter = new ScrapeFormatter(options.config);

    return new ScrapeJob({ fileWriteQueue, formatter, ...options });
  }

  public async run(): Promise<Result<ScrapedMessagesPathBuilder, Error>> {
    const logChannel = new BroadcastChannel(ScrapeWorkerChannels.Logs);
    logChannel.postMessage(`Web scraping "${this.origin.title}"...`);

    const root = this.pathBuilder.getJavadocPath();
    rmSync(root, { recursive: true, force: true });

    let scraper: Scraper;
    let withUrls = true;
    if (this.origin.url.startsWith(ScrapeJob.FileUrlPrefix)) {
      const filePath = this.origin.url.slice(ScrapeJob.FileUrlPrefix.length);
      scraper = Scraper.fromPath(filePath);
      withUrls = false;
    } else {
      scraper = Scraper.fromURL(this.origin.url);
    }

    const javadocs = await scraper.scrape().catch((e) => e as Error);
    if (javadocs instanceof Error) {
      return err(javadocs);
    }

    logChannel.postMessage(
      `Finished web scraping "${this.origin.title}", saving messages locally...`,
    );

    if (javadocs.size === 0) {
      return err(new Error('Scraper returned no Javadocs'));
    }

    const objectsFolderPath = this.pathBuilder.getObjectsFolderPath();
    const membersFolderPath = this.pathBuilder.getMembersFolderPath();

    await mkdir(objectsFolderPath, { recursive: true });
    await mkdir(membersFolderPath, { recursive: true });

    const classes = javadocs.getClasses();
    for (const classData of classes.values()) {
      const idResult = this.saveObject({
        object: classData,
        members: [...classData.fields.values(), ...classData.methods.values()],
        withUrls,
      });
      if (idResult.isErr()) {
        return err(
          new Error(`Error while saving class: ${classData.name}`, {
            cause: idResult.error,
          }),
        );
      }
      const id = idResult.value;

      const autocomplete = this.formatter.formatObjectAutocomplete(classData);
      this.objectAutocompletions[id] = {
        m: autocomplete,
        n: classData.name.toLowerCase(),
        t: AnyEntityTypeMappingEnum[EntityTypeEnum.Class],
      };
    }

    const interfaces = javadocs.getInterfaces();
    for (const interfaceData of interfaces.values()) {
      const idResult = this.saveObject({
        object: interfaceData,
        members: [
          ...interfaceData.fields.values(),
          ...interfaceData.methods.values(),
        ],
        withUrls,
      });
      if (idResult.isErr()) {
        return err(
          new Error(`Error while saving interface: ${interfaceData.name}`, {
            cause: idResult.error,
          }),
        );
      }
      const id = idResult.value;

      const autocomplete =
        this.formatter.formatObjectAutocomplete(interfaceData);
      this.objectAutocompletions[id] = {
        m: autocomplete,
        n: interfaceData.name.toLowerCase(),
        t: AnyEntityTypeMappingEnum[EntityTypeEnum.Interface],
      };
    }

    const enums = javadocs.getEnums();
    for (const enumData of enums.values()) {
      const idResult = this.saveObject({
        object: enumData,
        members: [
          ...enumData.constants.values(),
          ...enumData.methods.values(),
          ...enumData.fields.values(),
        ],
        withUrls,
      });
      if (idResult.isErr()) {
        return err(
          new Error(`Error while saving enum: ${enumData.name}`, {
            cause: idResult.error,
          }),
        );
      }
      const id = idResult.value;

      const autocomplete = this.formatter.formatObjectAutocomplete(enumData);
      this.objectAutocompletions[id] = {
        m: autocomplete,
        n: enumData.name.toLowerCase(),
        t: AnyEntityTypeMappingEnum[EntityTypeEnum.Enum],
      };
    }

    const annotations = javadocs.getAnnotations();
    for (const annotationData of annotations.values()) {
      const name = `@${annotationData.name}`;
      const idResult = this.saveObject({
        object: { ...annotationData, name },
        members: [...annotationData.elements.values()],
        withUrls,
      });
      if (idResult.isErr()) {
        return err(
          new Error(`Error while saving annotation: ${name}`, {
            cause: idResult.error,
          }),
        );
      }
      const id = idResult.value;

      const autocomplete = this.formatter.formatObjectAutocomplete({
        ...annotationData,
        name,
      });
      this.objectAutocompletions[id] = {
        m: autocomplete,
        n: name.toLowerCase(),
        t: AnyEntityTypeMappingEnum[EntityTypeEnum.Annotation],
      };
    }

    const dataFilePath = this.pathBuilder.getDataFilePath();
    const data: AutocompleteDataSchemaOutput = {
      o: this.objectAutocompletions,
      m: this.memberAutocompletions,
      d: Date.now(),
      v: 1,
    };
    await writeFile(dataFilePath, JSON.stringify(data));

    if (!this.fileWriteQueue.isEmpty) {
      await once(this.fileWriteQueue, 'end');
    }

    return ok(this.pathBuilder);
  }

  protected saveObject(options: {
    object: AnyJavaObject;
    members: AnyJavaMember[];
    withUrls: boolean;
  }): Result<string, Error> {
    const { object, members, withUrls } = options;
    const id = this.createId(
      object.name.toLowerCase(),
      this.objectAutocompletions,
    );
    const objectFilePath = this.pathBuilder.getObjectFilePath(id);

    const message = this.formatter.formatObjectMessage({
      entity: object,
      commandOrigin: this.origin,
      withUrls,
    });
    this.fileWriteQueue.enqueue(async () => {
      await mkdir(dirname(objectFilePath), { recursive: true });
      await writeFile(objectFilePath, message);
    });

    for (const member of members) {
      const memberId = this.createId(
        `${object.name}${member.name}`.toLowerCase(),
        this.memberAutocompletions,
      );
      const memberFilePath = this.pathBuilder.getMemberFilePath(memberId);

      const messageResult = this.formatter.formatMemberMessage({
        member,
        parent: object,
        commandOrigin: this.origin,
        withUrls,
      });
      if (!messageResult.isOk()) return messageResult;
      const message = messageResult.value;

      this.fileWriteQueue.enqueue(async () => {
        await mkdir(dirname(memberFilePath), { recursive: true });
        await writeFile(memberFilePath, message);
      });

      const autocompleteResult = this.formatter.formatMemberAutocomplete(
        member,
        object,
      );
      if (!autocompleteResult.isOk()) return autocompleteResult;
      const autocomplete = autocompleteResult.value;

      this.memberAutocompletions[memberId] = {
        m: autocomplete,
        n: `${object.name}${member.name}`.toLowerCase(),
        t: AnyEntityTypeMappingEnum[member.entityType],
      };
    }

    return ok(id);
  }

  protected createId(id: string, object: Record<string, unknown>): string {
    // avoid collision with overloaded methods or objects of the same name
    let count = 0;
    while (`${id}-${count}` in object) {
      count++;
    }
    return count === 0 ? id : `${id}-${count}`;
  }
}
