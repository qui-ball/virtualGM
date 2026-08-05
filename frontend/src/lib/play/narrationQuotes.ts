/**
 * Split narration into plain text and quoted dialogue for visual highlighting.
 * Matches straight "..." and curly “...” pairs; leaves apostrophes alone.
 */

export type NarrationSegment =
  | { kind: 'text'; value: string }
  | { kind: 'quote'; value: string };

const QUOTE_PATTERN = /("[^"\n]*"|“[^”\n]*”)/g;

export function splitNarrationQuotes(content: string): NarrationSegment[] {
  if (!content) return [];
  const segments: NarrationSegment[] = [];
  let lastIndex = 0;
  QUOTE_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = QUOTE_PATTERN.exec(content)) != null) {
    if (match.index > lastIndex) {
      segments.push({
        kind: 'text',
        value: content.slice(lastIndex, match.index),
      });
    }
    segments.push({ kind: 'quote', value: match[0] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    segments.push({ kind: 'text', value: content.slice(lastIndex) });
  }
  return segments.length > 0 ? segments : [{ kind: 'text', value: content }];
}
