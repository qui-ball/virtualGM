import { describe, expect, it } from 'vitest';
import { DEMO_CHARACTER } from '@/lib/play/characterView';
import { recoverLeakedRollPrompts } from '@/lib/play/transcriptRecover';
import type { TranscriptEntry } from '@/lib/play/transcript';

const LEAKED_GM =
  "*Roll a Wit check to spot whatever's hiding in the brush.*<tool_call>ask_player_roll<arg_key>dice_count</arg_key><arg_value>1<arg_key>dice_type</arg_key><arg_value>d20<arg_key>purpose</arg_key><arg_value>Wit check<arg_key>stat</arg_key><arg_value>wit";

describe('recoverLeakedRollPrompts', () => {
  it('inserts a roll prompt after leaked GM narration', () => {
    const entries: TranscriptEntry[] = [
      {
        kind: 'message',
        id: 'gm1',
        role: 'gm',
        content: LEAKED_GM,
        timestamp: 1,
      },
    ];
    const recovered = recoverLeakedRollPrompts(entries, DEMO_CHARACTER);
    expect(recovered).toHaveLength(2);
    expect(recovered[0].kind).toBe('message');
    if (recovered[0].kind === 'message') {
      expect(recovered[0].content).not.toContain('<tool_call>');
    }
    expect(recovered[1].kind).toBe('roll_prompt');
  });
});
