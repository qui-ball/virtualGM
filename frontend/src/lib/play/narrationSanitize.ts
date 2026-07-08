import type { PendingAction } from '@/types';

const LEAKED_TOOL_BLOCK =
  /<tool_call>\s*(\w+)(.*?)(?:<\/tool_call>|$)/gis;
const ARG_PAIR =
  /<arg_key>\s*([^<]+?)\s*<\/arg_key>\s*<arg_value>\s*(.*?)(?=\s*<arg_key>|<\/tool_call>|$)/gis;
const DANGLING_TOOL_TAIL = /<tool_call>.*$/is;

const INT_FIELDS = new Set(['dice_count', 'modifier', 'dc']);

function parseArgPairs(body: string): Record<string, string> {
  const args: Record<string, string> = {};
  for (const match of body.matchAll(ARG_PAIR)) {
    args[match[1].trim()] = match[2].trim();
  }
  return args;
}

function coerceRollArgs(raw: Record<string, string>): Partial<PendingAction> {
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (INT_FIELDS.has(key)) {
      const n = Number.parseInt(value, 10);
      out[key] = Number.isNaN(n) ? value : n;
    } else {
      out[key] = value;
    }
  }
  return {
    action_type: 'ask_player_roll',
    tool_call_id: 'recovered-roll',
    purpose: String(out.purpose ?? 'Roll'),
    dice_count: Number(out.dice_count ?? 1),
    dice_type: (out.dice_type as PendingAction['dice_type']) ?? 'd20',
    stat: out.stat != null ? String(out.stat) : undefined,
    modifier: out.modifier != null ? Number(out.modifier) : undefined,
    dc: out.dc != null ? Number(out.dc) : undefined,
    vs_label: out.vs_label != null ? String(out.vs_label) : undefined,
    adv_type: out.adv_type != null ? String(out.adv_type) : undefined,
    adv_reason: out.adv_reason != null ? String(out.adv_reason) : undefined,
    success_text:
      out.success_text != null ? String(out.success_text) : undefined,
    fail_text: out.fail_text != null ? String(out.fail_text) : undefined,
    footer: out.footer != null ? String(out.footer) : undefined,
  };
}

/** Strip leaked tool-call markup; recover ask_player_roll args when present. */
export function extractLeakedAskPlayerRoll(text: string): {
  cleaned: string;
  args: Partial<PendingAction> | null;
} {
  let leakedArgs: Partial<PendingAction> | null = null;

  const cleaned = text
    .replace(LEAKED_TOOL_BLOCK, (_full, tool: string, body: string) => {
      if (tool.toLowerCase() !== 'ask_player_roll' || leakedArgs != null) {
        return '';
      }
      const raw = parseArgPairs(body);
      if (Object.keys(raw).length > 0) {
        leakedArgs = coerceRollArgs(raw);
      }
      return '';
    })
    .replace(DANGLING_TOOL_TAIL, '')
    .trim();

  return { cleaned, args: leakedArgs };
}

export function sanitizeNarrationText(text: string): string {
  return extractLeakedAskPlayerRoll(text).cleaned;
}
