import { readFile } from 'fs/promises';
import { err, ok, type Result } from 'neverthrow';
import { type AutocompleteDataSchemaOutput } from '../scrape/autocomplete/schema/AutocompleteDataSchemaOutput.js';
import type { ScrapedMessagesPathBuilder } from '../scrape/messages/ScrapedMessagesPathBuilder.js';

export class ScrapedJavadoc {
  protected readonly pathBuilder: ScrapedMessagesPathBuilder;

  protected readonly autocompleteData: AutocompleteDataSchemaOutput;

  constructor(
    pathBuilder: ScrapedMessagesPathBuilder,
    autocompleteData: AutocompleteDataSchemaOutput,
  ) {
    this.pathBuilder = pathBuilder;
    this.autocompleteData = autocompleteData;
  }

  public async readObjectMessage(id: string): Promise<Result<string, Error>> {
    const path = this.pathBuilder.getObjectFilePath(id);
    try {
      const message = await readFile(path, 'utf-8');
      return ok(message);
    } catch (e) {
      return err(e as Error);
    }
  }

  public async readMemberMessage(id: string): Promise<Result<string, Error>> {
    const path = this.pathBuilder.getMemberFilePath(id);
    try {
      const message = await readFile(path, 'utf-8');
      return ok(message);
    } catch (e) {
      return err(e as Error);
    }
  }

  public getAutocompleteData(): AutocompleteDataSchemaOutput {
    return this.autocompleteData;
  }
}
