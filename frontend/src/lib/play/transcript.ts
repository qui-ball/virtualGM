import type { StatShort } from '@/lib/play/stats';

export type AdvType = 'norm' | 'adv' | 'dis';

export type RollPromptFields = {
  id: string;
  label: string;
  source?: string;
  stat?: StatShort;
  modifier: number;
  dc?: number;
  vs?: number;
  vsLabel?: string;
  advType: AdvType;
  advReason?: string;
  footer?: string;
  successText?: string;
  failText?: string;
  /** True when display fields were inferred (API G1 stub). */
  stubEnriched: boolean;
};

export type RollResultFields = {
  id: string;
  promptId: string;
  label: string;
  stat?: StatShort;
  nat: number;
  dieA: number;
  dieB?: number;
  total: number;
  modifier: number;
  advUsed: AdvType;
  crit: boolean;
  fumble: boolean;
  pass: boolean | null;
  vs?: number;
  dc?: number;
  freeRoll?: boolean;
};

export type TranscriptEntry =
  | { kind: 'scene'; id: string; text: string; timestamp: number }
  | {
      kind: 'message';
      id: string;
      role: 'gm' | 'player' | 'system';
      content: string;
      timestamp: number;
      ooc?: boolean;
      error?: boolean;
    }
  | {
      kind: 'roll_prompt';
      id: string;
      prompt: RollPromptFields;
      rolled: boolean;
      advUsed?: AdvType;
      timestamp: number;
    }
  | { kind: 'roll_result'; id: string; result: RollResultFields; timestamp: number }
  | { kind: 'rest'; id: string; text: string; timestamp: number }
  | { kind: 'item'; id: string; text: string; timestamp: number };

export function createEntryId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function formatTranscriptTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Detect wireframe-style scene lines for marker rendering. */
export function parseSceneMarker(content: string): string | null {
  const trimmed = content.trim();
  const match = /^Scene\s*[·•]\s*(.+)$/i.exec(trimmed);
  return match ? `Scene · ${match[1].trim()}` : null;
}

export function markRollPromptRolled(
  entries: TranscriptEntry[],
  promptId: string,
  advUsed: AdvType,
): TranscriptEntry[] {
  return entries.map((e) =>
    e.kind === 'roll_prompt' && e.id === promptId
      ? { ...e, rolled: true, advUsed }
      : e,
  );
}

export function findActiveRollPrompt(
  entries: TranscriptEntry[],
): Extract<TranscriptEntry, { kind: 'roll_prompt' }> | null {
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i];
    if (e.kind === 'roll_prompt' && !e.rolled) {
      return e;
    }
  }
  return null;
}
