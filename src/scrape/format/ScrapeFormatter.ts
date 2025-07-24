import { hideLinkEmbed, hyperlink, inlineCode } from '@discordjs/formatters';
import {
  ElementTypeEnum,
  EntityTypeEnum,
  ModifierEnum,
  RetentionPolicyEnum,
} from 'javadocs-scraper';
import { err, ok, type Result } from 'neverthrow';
import type { JavadocCommandOriginSchemaOutput } from '../../config/command/origin/JavadocCommandOriginSchema.js';
import type { ConfigSchemaOutput } from '../../config/schema/ConfigSchema.js';
import { CommandLimits } from '../../discord/command/limits/CommandLimits.js';
import type { AnyJavaMember } from '../../javadoc/types/AnyJavaMember.js';
import type { AnyJavaObject } from '../../javadoc/types/AnyJavaObject.js';
import { TextFormatter } from '../../text/TextFormatter.js';
import { ScrapeMessageBuilder } from './ScrapeMessageBuilder.js';

export class ScrapeFormatter {
  // explicitly show these due to the utility of knowing that info
  protected static readonly NotHiddenAnnotations = new Set([
    '@Nullable',
    '@NonNull',
    '@NotNull',
  ]);

  // matches a single dot that isn't followed by another dot
  protected static readonly SingleDotRegex = /(?<!\.)\.(?!\.)/g;

  protected readonly maxLengths: ConfigSchemaOutput['maxLength'];

  protected readonly prefixes: ConfigSchemaOutput['prefixes'];

  protected readonly messages: ConfigSchemaOutput['messages'];

  constructor(
    config: Pick<ConfigSchemaOutput, 'maxLength' | 'prefixes' | 'messages'>,
  ) {
    this.maxLengths = config.maxLength;
    this.prefixes = config.prefixes;
    this.messages = config.messages;
  }

  public formatMemberAutocomplete(
    member: AnyJavaMember,
    parent: AnyJavaObject,
  ): Result<string, Error> {
    let name;
    switch (member.entityType) {
      case EntityTypeEnum.AnnotationElement:
        name = `${parent.name}(${member.returns.type} ${member.name})`;
        break;
      case EntityTypeEnum.Field:
        name = `${parent.name}${member.modifiers.includes(ModifierEnum.Static) ? '.' : '#'}${member.name}`;
        break;
      case EntityTypeEnum.Method: {
        const parameters = member.parameters
          .map((p) => {
            const type = p.type.split(ScrapeFormatter.SingleDotRegex).at(-1);
            return `${type} ${p.name}`;
          })
          .join(', ');
        const separator = member.modifiers.includes(ModifierEnum.Static)
          ? '.'
          : '#';
        name = `${parent.name}${separator}${member.name}(${parameters})`;
        break;
      }
      case EntityTypeEnum.EnumConstant:
        name = `${parent.name}.${member.name}`;
        break;
      default:
        return err(new Error(`Unhandled member: ${member}`));
    }

    const parts = [name];

    if (member.description && member.description.text) {
      const description = member.description.text;
      const sanitized = description?.replace(/\n/g, '');
      if (sanitized?.length) {
        parts.push(`- ${sanitized}`);
      }
    }

    const truncated = TextFormatter.truncateByWords(
      parts.join(' '),
      CommandLimits.Autocomplete.Name
        - this.prefixes.autocomplete[member.entityType].length
        // account for the prefix space
        - 1,
    );

    return ok(truncated);
  }

  public formatObjectAutocomplete(entity: AnyJavaObject): string {
    const parts = [entity.name];

    if (entity.description) {
      const description = entity.description.text;
      const sanitized = description?.replace(/\n/g, '');
      if (sanitized?.length) {
        parts.push(`- ${sanitized}`);
      }
    }

    return TextFormatter.truncateByWords(
      parts.join(' '),
      CommandLimits.Autocomplete.Name
        - this.prefixes.autocomplete[entity.entityType].length
        // account for the prefix space
        - 1,
    );
  }

  public formatMemberMessage(options: {
    member: AnyJavaMember;
    parent: AnyJavaObject;
    commandOrigin: JavadocCommandOriginSchemaOutput;
    withUrls: boolean;
  }): Result<string, Error> {
    const { member, parent, commandOrigin, withUrls } = options;
    let name: string = '';
    switch (member.entityType) {
      case EntityTypeEnum.AnnotationElement:
        name = `${parent.name}(${member.returns.type} ${member.name})`;
        break;
      case EntityTypeEnum.Field: {
        const separator = member.modifiers.includes(ModifierEnum.Static)
          ? '.'
          : '#';
        name = `${member.type} ${parent.name}${separator}${member.name}`;
        break;
      }
      case EntityTypeEnum.Method: {
        const parameters = member.parameters
          .map((p) => {
            const type = p.type.split(ScrapeFormatter.SingleDotRegex).at(-1);
            const parts = [type, p.name];
            for (const annotation of p.annotations) {
              if (ScrapeFormatter.NotHiddenAnnotations.has(annotation)) {
                parts.unshift(annotation);
              }
            }
            return parts.join(' ');
          })
          .join(', ');
        const separator = member.modifiers.includes(ModifierEnum.Static)
          ? '.'
          : '#';
        for (const annotation of member.annotations) {
          if (ScrapeFormatter.NotHiddenAnnotations.has(annotation)) {
            name += `${annotation} `;
            break;
          }
        }
        name += `${member.returns.type} ${parent.name}${separator}${member.name}(${parameters})`;
        break;
      }
      case EntityTypeEnum.EnumConstant:
        name = `${parent.name}.${member.name}`;
        break;
      default:
        return err(new Error(`Unhandled member: ${member}`));
    }

    const builder = new ScrapeMessageBuilder({
      entity: { ...member, name },
      maxLengths: this.maxLengths,
      origin: commandOrigin,
      messages: this.messages,
      withUrls,
    });

    if (member.entityType === EntityTypeEnum.Method) {
      builder.addListIfNotEmpty(
        {
          name: 'Parameters',
          maxLengthPerItem: this.maxLengths.extraPropertiesDescription,
          items: member.parameters.map((p) => ({
            name: inlineCode(`${p.type} ${p.name}`),
            content: p.description,
          })),
        },
        5,
      );

      if (member.returns.description) {
        builder.addPart({
          name: 'Returns',
          content: member.returns.description,
          inline: true,
        });
      }
    }

    const joined = builder.build();

    return ok(joined);
  }

  public formatObjectMessage(options: {
    entity: AnyJavaObject;
    commandOrigin: JavadocCommandOriginSchemaOutput;
    withUrls: boolean;
  }): string {
    const { entity, commandOrigin, withUrls } = options;

    const builder = new ScrapeMessageBuilder({
      entity,
      maxLengths: this.maxLengths,
      origin: commandOrigin,
      messages: this.messages,
      withUrls,
    });

    if (entity.entityType !== EntityTypeEnum.Annotation) {
      return builder.build();
    }

    builder.addListIfNotEmpty(
      {
        name: 'Elements',
        maxLengthPerItem: this.maxLengths.extraPropertiesDescription,
        items: entity.elements.map((element) => ({
          name: withUrls
            ? hyperlink(
                inlineCode(`${element.returns.type} ${element.name}`),
                hideLinkEmbed(element.url),
              )
            : inlineCode(`${element.returns.type} ${element.name}`),
          content: element.description,
        })),
      },
      5,
    );

    if (entity.targets.length) {
      const formatted =
        entity.targets[0] === ElementTypeEnum.None
          ? inlineCode('{}')
          : entity.targets.map((target) => inlineCode(target)).join(', ');

      builder.addText({
        name: 'Targets',
        text: formatted,
        inline: true,
      });
    }

    builder.addText({
      name: 'Retention',
      text: inlineCode(entity.retention ?? RetentionPolicyEnum.Class),
      inline: true,
    });

    return builder.build();
  }
}
