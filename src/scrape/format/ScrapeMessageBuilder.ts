import {
  bold,
  hideLinkEmbed,
  hyperlink,
  inlineCode,
  underline,
} from '@discordjs/formatters';
import { type DeprecationContent, type NodeContent } from 'javadocs-scraper';
import { type JavadocCommandOriginSchemaOutput } from '../../config/command/origin/JavadocCommandOriginSchema.js';
import { type ConfigSchemaOutput } from '../../config/schema/ConfigSchema.js';
import { TextFormatter } from '../../text/TextFormatter.js';

type BaseEntityData = {
  readonly name: string;
  readonly url: string;
  readonly description: NodeContent | null;
  readonly deprecation: DeprecationContent | null;
};

type Part = {
  name: string;
  inline: boolean;
  content: NodeContent | null;
};

type ListItem = Omit<Part, 'inline'>;

type List = {
  name: string;
  maxLengthPerItem: number;
  items: ListItem[];
};

export class ScrapeMessageBuilder {
  protected readonly origin: JavadocCommandOriginSchemaOutput;

  protected readonly maxLengths: ConfigSchemaOutput['maxLength'];

  protected readonly entity: BaseEntityData;

  protected readonly messages: ConfigSchemaOutput['messages'];

  protected readonly withUrls: boolean;

  protected parts: Part[] = [];

  constructor(options: {
    entity: BaseEntityData;
    origin: JavadocCommandOriginSchemaOutput;
    maxLengths: ConfigSchemaOutput['maxLength'];
    messages: ConfigSchemaOutput['messages'];
    withUrls: boolean;
  }) {
    this.entity = options.entity;
    this.origin = options.origin;
    this.maxLengths = options.maxLengths;
    this.messages = options.messages;
    this.withUrls = options.withUrls;
  }

  public addPart(part: Part): this {
    this.parts.push(part);
    return this;
  }

  public addText(part: Omit<Part, 'content'> & { text: string }): this {
    this.parts.push({
      name: part.name,
      inline: part.inline ?? true,
      content: {
        text: part.text,
        html: null,
      },
    });
    return this;
  }

  public addListIfNotEmpty(list: List, upTo: number): this {
    if (!list.items.length) return this;
    const itemsWithContent = list.items.filter(
      (item) => item.content && (item.content.text || item.content.html),
    );
    if (!itemsWithContent.length) return this;

    const lines: string[] = [];
    for (const item of list.items) {
      if (lines.length === upTo) break;
      const content = this.formatContent({
        content: item.content,
        maxLength: list.maxLengthPerItem,
        short: true,
      });
      if (!content) {
        lines.push(`- ${item.name}`);
      } else {
        lines.push(`- ${item.name} - ${content}`);
      }
    }
    if (lines.length !== list.items.length) {
      lines.push(`...and ${list.items.length - lines.length} more`);
    }

    this.parts.push({
      name: list.name,
      inline: false,
      content: {
        text: lines.join('\n'),
        html: null,
      },
    });

    return this;
  }

  public build(): string {
    const objectTitle = this.withUrls
      ? hyperlink(
          bold(inlineCode(this.entity.name)),
          hideLinkEmbed(this.entity.url),
        )
      : bold(inlineCode(this.entity.name));
    const originTitle = this.withUrls
      ? hyperlink(this.origin.title, hideLinkEmbed(this.origin.url))
      : this.origin.title;
    const titleParts: string[] = [];

    if (this.entity.deprecation) {
      const deprecationTitle = this.entity.deprecation.forRemoval
        ? 'FOR REMOVAL'
        : 'DEPRECATED';
      titleParts.push(underline(bold(deprecationTitle)));
    }

    titleParts.push(objectTitle, '-', originTitle);
    const title = titleParts.join(' ');

    const lines = [title];
    if (this.entity.description) {
      const description = this.formatContent({
        content: this.entity.description,
        maxLength: this.maxLengths.description,
        short: false,
      });
      if (description) {
        lines.push(description);
      }
    }

    const parts: Part[] = [...this.parts];

    if (this.entity.deprecation) {
      const deprecationContent = this.formatContent({
        content: this.entity.deprecation,
        maxLength: this.maxLengths.deprecation,
        // prioritize deprecation if there's no description
        short: !!this.entity.description,
      });
      if (deprecationContent) {
        const title = this.entity.deprecation.forRemoval
          ? 'For Removal'
          : 'Deprecated';
        parts.unshift({
          name: underline(title),
          inline: true,
          content: {
            text: deprecationContent,
            html: null,
          },
        });
      }
    }

    for (const part of parts) {
      const content = part.content?.text
        ?.split('\n')
        .filter((s) => !!s.trim())
        .join('\n');
      if (!content) continue;

      const formattedPart = part.inline
        ? `${bold(part.name)}: ${content}`
        : `${bold(part.name)}:\n${content}`;
      lines.push(formattedPart);
    }

    return lines.join('\n');
  }

  protected formatContent(options: {
    content: NodeContent | null;
    maxLength: number | null;
    short: boolean;
  }): string | null {
    if (!options.content) {
      return null;
    }

    const formatted =
      options.content.html && options.content.html !== options.content.text
        ? TextFormatter.htmlToMarkdown({
            html: options.content.html,
            baseUrl: this.withUrls ? this.entity.url : null,
            codeblockOmit: this.messages.codeblockOmitted,
          })
        : options.content.text;
    if (!formatted) {
      return null;
    }

    const parts = formatted.split('\n').filter((s) => !!s.trim());

    const truncated = options.maxLength
      ? TextFormatter.truncateByWords(parts.join('\n'), options.maxLength)
      : parts.join('\n');

    let result = truncated;

    if (options.short) {
      const parts = truncated.split('\n');
      const firstSentence = parts[0];
      result =
        parts.length === 1 || parts[0].endsWith('.')
          ? firstSentence
          : `${firstSentence}…`;
    }

    if (result === '…') {
      return null;
    }

    return result;
  }
}
