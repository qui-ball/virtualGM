import { extractLeakedAskPlayerRoll } from '@/lib/play/narrationSanitize';
import { pendingActionToRollPrompt } from '@/lib/play/pendingActionAdapter';
import { createEntryId, type TranscriptEntry } from '@/lib/play/transcript';
import type { CharacterState, PendingAction } from '@/types';

function toPendingAction(
  args: Partial<PendingAction>,
): PendingAction {
  return {
    action_type: 'ask_player_roll',
    tool_call_id: args.tool_call_id ?? `recovered-${createEntryId()}`,
    purpose: args.purpose ?? 'Roll',
    dice_count: args.dice_count ?? 1,
    dice_type: args.dice_type ?? 'd20',
    stat: args.stat,
    modifier: args.modifier,
    dc: args.dc,
    vs_label: args.vs_label,
    adv_type: args.adv_type,
    adv_reason: args.adv_reason,
    success_text: args.success_text,
    fail_text: args.fail_text,
    footer: args.footer,
  };
}

/** Rebuild roll prompts when GM narration leaked tool-call markup (client resume). */
export function recoverLeakedRollPrompts(
  entries: TranscriptEntry[],
  character: CharacterState | null = null,
): TranscriptEntry[] {
  const out: TranscriptEntry[] = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (entry.kind !== 'message' || entry.role !== 'gm') {
      out.push(entry);
      continue;
    }

    const { cleaned, args } = extractLeakedAskPlayerRoll(entry.content);
    if (!args) {
      out.push(entry);
      continue;
    }

    const next = entries[i + 1];
    const hasPrompt =
      next?.kind === 'roll_prompt' && !next.rolled;

    out.push({ ...entry, content: cleaned });

    if (!hasPrompt) {
      const promptId = createEntryId();
      const pending = toPendingAction(args);
      out.push({
        kind: 'roll_prompt',
        id: promptId,
        prompt: pendingActionToRollPrompt(pending, character, promptId),
        rolled: false,
        timestamp: entry.timestamp + 1,
      });
    }
  }

  return out;
}
