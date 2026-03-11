/**
 * A simple markdown renderer for basic formatting.
 * Supports: headings (#), bold (**), italics (* or _), inline code (`),
 * bullet lists (- or *), links ([text](https://...)), and line breaks.
 */
function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeLinkHref(value) {
  const raw = String(value || '').trim();
  if (!raw) {
    return '';
  }

  if (/^https?:\/\//i.test(raw) || /^mailto:/i.test(raw)) {
    return raw;
  }

  return '';
}

function renderInlineMarkdown(value) {
  const codeSegments = [];
  const linkSegments = [];

  let escaped = escapeHtml(value)
    .replace(/`([^`]+)`/g, (_, codeContent) => {
      const token = `@@MDCODE${codeSegments.length}@@`;
      codeSegments.push(`<code>${codeContent}</code>`);
      return token;
    })
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
      const safeHref = sanitizeLinkHref(href);
      if (!safeHref) {
        return label;
      }

      const token = `@@MDLINK${linkSegments.length}@@`;
      linkSegments.push(`<a href="${escapeHtml(safeHref)}" target="_blank" rel="noopener noreferrer" class="underline">${label}</a>`);
      return token;
    })
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/(^|[^_])_(?!\s)(.+?)_(?!_)/g, '$1<em>$2</em>');

  codeSegments.forEach((segment, index) => {
    escaped = escaped.replace(`@@MDCODE${index}@@`, segment);
  });

  linkSegments.forEach((segment, index) => {
    escaped = escaped.replace(`@@MDLINK${index}@@`, segment);
  });

  return escaped;
}

export function renderMarkdown(text) {
  if (!text) return '';

  const lines = String(text).split('\n');
  const processedLines = lines.map((line) => {
    const trimmed = line.trim();

    if (/^#{1,6}\s+/.test(trimmed)) {
      const level = trimmed.match(/^(#{1,6})/)[1].length;
      const headerText = trimmed.replace(/^#{1,6}\s+/, '');
      return `<h${level} class="markdown-h${level}">${renderInlineMarkdown(headerText)}</h${level}>`;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      return `<li class="ml-4 list-disc">${renderInlineMarkdown(trimmed.replace(/^[-*]\s+/, ''))}</li>`;
    }

    return renderInlineMarkdown(line);
  });

  let result = '';
  let inList = false;

  processedLines.forEach((line) => {
    if (line.startsWith('<li')) {
      if (!inList) {
        result += '<ul class="my-2 space-y-1">';
        inList = true;
      }
      result += line;
      return;
    }

    if (inList) {
      result += '</ul>';
      inList = false;
    }

    if (line.startsWith('<h')) {
      result += line;
      return;
    }

    if (line.trim()) {
      result += `<p class="mb-2 last:mb-0">${line}</p>`;
      return;
    }

    result += '<div class="h-2"></div>';
  });

  if (inList) {
    result += '</ul>';
  }

  return result;
}
