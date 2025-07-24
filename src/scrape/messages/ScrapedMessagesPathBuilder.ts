import { resolve } from 'node:path';

export class ScrapedMessagesPathBuilder {
  protected static readonly CacheRoot = '__cache__';

  protected readonly projectRoot: string;

  protected readonly javadocPath: string;

  protected readonly javadocFolderName: string;

  constructor(options: {
    projectRoot: string;
    javadocPath: string;
    javadocFolderName: string;
  }) {
    this.projectRoot = options.projectRoot;
    this.javadocPath = options.javadocPath;
    this.javadocFolderName = options.javadocFolderName;
  }

  public static getCacheRoot(projectRoot: string): string {
    return resolve(projectRoot, ScrapedMessagesPathBuilder.CacheRoot);
  }

  public static createCommandBuilder(projectRoot: string, commandName: string) {
    const cacheRoot = ScrapedMessagesPathBuilder.getCacheRoot(projectRoot);
    const javadocRoot = resolve(cacheRoot, commandName);

    return new ScrapedMessagesPathBuilder({
      projectRoot,
      javadocPath: javadocRoot,
      javadocFolderName: commandName,
    });
  }

  public static createSubcommandBuilder(
    projectRoot: string,
    commandName: string,
    subcommandName: string,
  ) {
    const cacheRoot = ScrapedMessagesPathBuilder.getCacheRoot(projectRoot);
    const javadocFolderName = `${commandName}@${subcommandName}`;
    const javadocRoot = resolve(cacheRoot, javadocFolderName);

    return new ScrapedMessagesPathBuilder({
      projectRoot,
      javadocPath: javadocRoot,
      javadocFolderName,
    });
  }

  public getDataFilePath(): string {
    return resolve(this.javadocPath, 'data.json');
  }

  public getMembersFolderPath(): string {
    return resolve(this.javadocPath, 'members');
  }

  public getMemberFilePath(memberId: string): string {
    const first = memberId[0];
    return resolve(this.javadocPath, 'members', first, `${memberId}.txt`);
  }

  public getObjectsFolderPath(): string {
    return resolve(this.javadocPath, 'objects');
  }

  public getObjectFilePath(objectId: string): string {
    const first = objectId[0];
    return resolve(this.javadocPath, 'objects', first, `${objectId}.txt`);
  }

  public resolve(path: string): string {
    return resolve(this.javadocPath, path);
  }

  public getJavadocFolderName(): string {
    return this.javadocFolderName;
  }

  public getJavadocPath(): string {
    return this.javadocPath;
  }

  public getProjectRoot(): string {
    return this.projectRoot;
  }
}
