import { pendingActionToRollPrompt } from '@/lib/play/pendingActionAdapter';
import type { TranscriptEntry } from '@/lib/play/transcript';
import type { CharacterState, PendingAction } from '@/types';

/** Stable id so dev roll UI stays wired to `pendingPromptIdRef`. */
export const DEV_DEMO_ROLL_PROMPT_ID = 'dev-demo-roll-prompt';

/** Enriched pending action for manual roll-card testing (dev only). */
export const DEV_DEMO_PENDING_ACTION: PendingAction = {
  action_type: 'attack',
  dice_count: 1,
  dice_type: 'd20',
  purpose: 'Strike the goblin',
  tool_call_id: 'dev-demo-roll',
  stat: 'finesse',
  modifier: 4,
  dc: 15,
  vs_label: 'AC 15',
  adv_type: 'adv',
  adv_reason: 'flanking',
  footer: 'crit on nat-20',
  success_text: 'Your blade finds a gap.',
  fail_text: 'The goblin deflects the blow.',
};

/** Dev-only roll card — not backed by `session.pending_deferred` on the API. */
export function isDevDemoPendingAction(
  action: PendingAction | null | undefined,
): boolean {
  return action?.tool_call_id === DEV_DEMO_PENDING_ACTION.tool_call_id;
}

export function createDevDemoRollPromptEntry(
  character: CharacterState | null,
  timestamp: number = Date.now(),
): TranscriptEntry {
  return {
    kind: 'roll_prompt',
    id: DEV_DEMO_ROLL_PROMPT_ID,
    prompt: pendingActionToRollPrompt(
      DEV_DEMO_PENDING_ACTION,
      character,
      DEV_DEMO_ROLL_PROMPT_ID,
    ),
    rolled: false,
    timestamp,
  };
}
