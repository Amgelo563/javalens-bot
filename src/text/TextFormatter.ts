import {
  bold,
  escapeBold,
  hideLinkEmbed,
  hyperlink,
} from '@discordjs/formatters';
import { resolve } from 'node:url';
import Turndown from 'turndown';

export class TextFormatter {
  protected static readonly NonDesiredEndCharacters = /[:;,.]/;

  protected static readonly WhitespaceCollapseRegex = /\s+/g;

  public static collapseWhitespace(text: string): string {
    if (!text) return '';
    return text.replace(TextFormatter.WhitespaceCollapseRegex, ' ').trim();
  }

  // Truncates by words. If the first sentence is longer than maxLength, truncate until the max length will be reached
  public static truncateByWords(text: string, maxLength: number) {
    if (text.length <= maxLength) {
      return text;
    }

    const words = text.split(' ');
    let result = '';
    let currentLength = 0;

    for (const word of words) {
      const newLength = currentLength + word.length + 1;
      if (newLength > maxLength) break;

      result += (result ? ' ' : '') + word;
      currentLength = newLength;
    }

    if (!result.trim().length) return '';

    const trimmed = result.trimEnd();

    if (TextFormatter.NonDesiredEndCharacters.test(trimmed.at(-1) || '')) {
      result = trimmed.slice(0, -1);
    }

    return `${result}…`;
  }

  public static htmlToMarkdown(options: {
    html: string;
    baseUrl: string | null;
    codeblockOmit: string;
  }): string {
    const { html, baseUrl, codeblockOmit } = options;
    // FIXME: sadly Turndown doesn't support custom base URLs, or custom parameters while parsing
    // so we have to make a new instance for each conversion
    const turndown = new Turndown({
      bulletListMarker: '-',
    })
      .addRule('whitespace collapse', {
        filter: ['p', 'div', 'section'],
        replacement(content) {
          return TextFormatter.collapseWhitespace(content);
        },
      })
      .addRule('codeblocks', {
        filter: ['pre'],
        replacement() {
          return ` ${codeblockOmit}\n`;
        },
      })
      .addRule('headings', {
        filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
        replacement(content, node) {
          if (!content) {
            return '';
          }

          // Check if the heading is inside a list
          let parent = node.parentNode;
          while (parent) {
            if (parent.nodeName === 'UL' || parent.nodeName === 'OL') {
              node.localName = 'b';
              break;
            }
            parent = parent.parentNode;
          }

          return bold(escapeBold(content)) + '\n';
        },
      })
      .addRule('links', {
        filter: ['a'],
        replacement(content, node) {
          if (!baseUrl) {
            return content;
          }

          if (node.nodeType === 1) {
            const href = node.getAttribute('href');
            if (!href) {
              return content;
            }
            if (href === content) {
              return href;
            }

            const url = resolve(baseUrl, href);
            return hyperlink(content, hideLinkEmbed(url));
          }
          return content;
        },
      });

    const markdown = turndown.turndown(html);

    return markdown.split('\n').filter(Boolean).join('\n');
  }
}
