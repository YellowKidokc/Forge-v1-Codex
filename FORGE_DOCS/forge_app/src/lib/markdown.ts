/**
 * Markdown ↔ HTML conversion for FORGE editor.
 * Handles promoted block syntax (^blockId) during roundtrip.
 */

// Simple markdown → HTML for loading into TipTap
// We handle: headings, paragraphs, bold, italic, inline code, code blocks,
// blockquotes, unordered lists, horizontal rules, and promoted block markers.

const PROMOTED_BLOCK_RE = /\s+\^([a-zA-Z0-9_-]+)\s*$/;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function processInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
}

export function markdownToHtml(md: string): string {
  const lines = md.split('\n');
  const blocks: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Blank line
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(escapeHtml(lines[i]));
        i++;
      }
      i++; // skip closing ```
      blocks.push(`<pre><code${lang ? ` class="language-${lang}"` : ''}>${codeLines.join('\n')}</code></pre>`);
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      let text = headingMatch[2];
      
      // Check for promoted block ID on heading
      const promoMatch = text.match(PROMOTED_BLOCK_RE);
      if (promoMatch) {
        text = text.replace(PROMOTED_BLOCK_RE, '');
        blocks.push(
          `<div data-type="promoted-block" data-block-id="${promoMatch[1]}">` +
          `<h${level}>${processInline(text)}</h${level}>` +
          `</div>`
        );
      } else {
        blocks.push(`<h${level}>${processInline(text)}</h${level}>`);
      }
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      blocks.push('<hr>');
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      blocks.push(`<blockquote><p>${processInline(quoteLines.join(' '))}</p></blockquote>`);
      continue;
    }

    // Unordered list
    if (/^\s*[-*+]\s/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s/.test(lines[i])) {
        listItems.push(lines[i].replace(/^\s*[-*+]\s/, ''));
        i++;
      }
      blocks.push(
        '<ul>' +
        listItems.map(item => `<li><p>${processInline(item)}</p></li>`).join('') +
        '</ul>'
      );
      continue;
    }

    // Paragraph (may span multiple non-blank lines)
    const paraLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== '' && !lines[i].startsWith('#') && !lines[i].startsWith('```') && !lines[i].startsWith('> ') && !/^\s*[-*+]\s/.test(lines[i]) && !/^(-{3,}|\*{3,}|_{3,})$/.test(lines[i].trim())) {
      paraLines.push(lines[i]);
      i++;
    }
    
    let paraText = paraLines.join(' ');
    
    // Check for promoted block ID
    const promoMatch = paraText.match(PROMOTED_BLOCK_RE);
    if (promoMatch) {
      paraText = paraText.replace(PROMOTED_BLOCK_RE, '');
      blocks.push(
        `<div data-type="promoted-block" data-block-id="${promoMatch[1]}">` +
        `<p>${processInline(paraText)}</p>` +
        `</div>`
      );
    } else {
      blocks.push(`<p>${processInline(paraText)}</p>`);
    }
  }

  return blocks.join('');
}

// HTML/TipTap JSON → Markdown serialization
export function tiptapJsonToMarkdown(doc: any): string {
  if (!doc || !doc.content) return '';
  return doc.content.map((node: any) => serializeNode(node)).join('\n\n');
}

function serializeNode(node: any): string {
  switch (node.type) {
    case 'heading': {
      const prefix = '#'.repeat(node.attrs?.level || 1);
      return `${prefix} ${serializeInline(node.content)}`;
    }
    case 'paragraph':
      return serializeInline(node.content);
    
    case 'codeBlock': {
      const lang = node.attrs?.language || '';
      const code = node.content?.[0]?.text || '';
      return '```' + lang + '\n' + code + '\n```';
    }
    
    case 'blockquote':
      return (node.content || [])
        .map((child: any) => '> ' + serializeNode(child))
        .join('\n');
    
    case 'bulletList':
      return (node.content || [])
        .map((item: any) => serializeNode(item))
        .join('\n');
    
    case 'listItem':
      return '- ' + (node.content || [])
        .map((child: any) => serializeNode(child))
        .join('\n  ');
    
    case 'horizontalRule':
      return '---';
    
    case 'promotedBlock': {
      const blockId = node.attrs?.blockId || '';
      const inner = (node.content || [])
        .map((child: any) => serializeNode(child))
        .join('\n\n');
      // Append block ID to the last line of inner content
      const lines = inner.split('\n');
      if (lines.length > 0) {
        lines[lines.length - 1] = lines[lines.length - 1] + ` ^${blockId}`;
      }
      return lines.join('\n');
    }
    
    default:
      if (node.content) {
        return node.content.map((child: any) => serializeNode(child)).join('');
      }
      return node.text || '';
  }
}

function serializeInline(content: any[] | undefined): string {
  if (!content) return '';
  return content.map((node: any) => {
    let text = node.text || '';
    if (node.marks) {
      // Apply marks in order
      for (const mark of node.marks) {
        switch (mark.type) {
          case 'bold':
            text = `**${text}**`;
            break;
          case 'italic':
            text = `*${text}*`;
            break;
          case 'code':
            text = `\`${text}\``;
            break;
        }
      }
    }
    return text;
  }).join('');
}

// Generate a short unique block ID
export function generateBlockId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}
