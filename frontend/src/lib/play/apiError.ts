/** Extract a user-facing message from `API ${status}: ${body}` errors. */
export function parseApiErrorMessage(err: unknown): string {
  const text = err instanceof Error ? err.message : String(err);
  const match = /^API \d+: (.+)$/s.exec(text);
  if (!match) return text;
  const body = match[1].trim();
  try {
    const parsed = JSON.parse(body) as { detail?: string | unknown };
    if (typeof parsed.detail === 'string') return parsed.detail;
    if (Array.isArray(parsed.detail)) {
      return parsed.detail
        .map((d) => (typeof d === 'object' && d && 'msg' in d ? String((d as { msg: string }).msg) : String(d)))
        .join('; ');
    }
  } catch {
    /* plain text body */
  }
  return body;
}
