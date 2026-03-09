/**
 * A very simple markdown renderer for basic formatting.
 * Supports: bold (**), italics (* or _), lists (- or *), links ([text](url)), and line breaks.
 */
export function renderMarkdown(text) {
    if (!text) return '';

    let html = String(text)
        // Escaping some HTML characters to prevent XSS (though we trust the source here, it's good practice)
        .replace(/&/g, '&amp;');

    // Inline formats
    html = html
        // Bold: **text**
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Italics: *text* or _text_
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/_(.*?)_/g, '<em>$1</em>')
        // Links: [text](url)
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="underline">$1</a>');

    // Block formats (simple)
    const lines = html.split('\n');
    const processedLines = lines.map(line => {
        const trimmed = line.trim();

        // Headers: # Header
        if (/^#{1,6}\s+/.test(trimmed)) {
            const level = trimmed.match(/^(#{1,6})/)[1].length;
            const text = trimmed.replace(/^#{1,6}\s+/, '');
            return `<h${level} class="markdown-h${level}">${text}</h${level}>`;
        }

        // Lists: - item or * item
        if (/^[-*]\s+/.test(trimmed)) {
            return `<li class="ml-4 list-disc">${trimmed.replace(/^[-*]\s+/, '')}</li>`;
        }

        return line;
    });

    // Rejoin and handle paragraphs/lists
    let result = '';
    let inList = false;

    processedLines.forEach(line => {
        if (line.startsWith('<li')) {
            if (!inList) {
                result += '<ul class="my-2 space-y-1">';
                inList = true;
            }
            result += line;
        } else if (line.startsWith('<h')) {
            if (inList) {
                result += '</ul>';
                inList = false;
            }
            result += line;
        } else {
            if (inList) {
                result += '</ul>';
                inList = false;
            }
            if (line.trim()) {
                result += `<p class="mb-2 last:mb-0">${line}</p>`;
            } else {
                result += '<div class="h-2"></div>'; // Spacing for empty lines
            }
        }
    });

    if (inList) {
        result += '</ul>';
    }

    return result;
}
