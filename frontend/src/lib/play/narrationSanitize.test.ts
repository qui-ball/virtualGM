import { describe, expect, it } from 'vitest';
import { extractLeakedAskPlayerRoll } from '@/lib/play/narrationSanitize';

const SAMPLE =
  "*Roll a Wit check to spot whatever's hiding in the brush.*<tool_call>ask_player_roll<arg_key>dice_count</arg_key><arg_value>1<arg_key>dice_type</arg_key><arg_value>d20<arg_key>purpose</arg_key><arg_value>Wit check<arg_key>stat</arg_key><arg_value>wit";

describe('extractLeakedAskPlayerRoll', () => {
  it('strips leaked tool markup and recovers roll args', () => {
    const { cleaned, args } = extractLeakedAskPlayerRoll(SAMPLE);
    expect(cleaned).toBe(
      "*Roll a Wit check to spot whatever's hiding in the brush.*",
    );
    expect(args).toMatchObject({
      dice_count: 1,
      dice_type: 'd20',
      purpose: 'Wit check',
      stat: 'wit',
    });
  });

  it('leaves normal narration unchanged', () => {
    const text = 'The wind dies. Something moves in the brush.';
    const { cleaned, args } = extractLeakedAskPlayerRoll(text);
    expect(cleaned).toBe(text);
    expect(args).toBeNull();
  });
});
