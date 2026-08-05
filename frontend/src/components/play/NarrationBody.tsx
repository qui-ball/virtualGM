import { splitNarrationQuotes } from '@/lib/play/narrationQuotes';

type NarrationBodyProps = {
  content: string;
  streaming?: boolean;
  /** When false, render plain text (player bubbles). */
  highlightQuotes?: boolean;
};

/** GM / player bubble body with quoted dialogue visually emphasized. */
export function NarrationBody({
  content,
  streaming = false,
  highlightQuotes = true,
}: NarrationBodyProps) {
  const segments = highlightQuotes
    ? splitNarrationQuotes(content)
    : [{ kind: 'text' as const, value: content }];

  return (
    <p className="play-bubble-body whitespace-pre-wrap">
      {segments.map((seg, i) =>
        seg.kind === 'quote' ? (
          <q key={i} className="play-narration-quote">
            {stripOuterQuotes(seg.value)}
          </q>
        ) : (
          <span key={i}>{seg.value}</span>
        ),
      )}
      {streaming ? <span className="play-caret" aria-hidden /> : null}
    </p>
  );
}

function stripOuterQuotes(value: string): string {
  if (value.length >= 2) {
    const start = value[0];
    const end = value[value.length - 1];
    if (
      (start === '"' && end === '"') ||
      (start === '“' && end === '”')
    ) {
      return value.slice(1, -1);
    }
  }
  return value;
}
