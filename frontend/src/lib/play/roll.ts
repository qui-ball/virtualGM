import type { AdvType } from '@/lib/play/transcript';

export type RollD20Input = {
  adv?: AdvType;
  modifier?: number;
  vs?: number | null;
};

export type RollD20Result = {
  dieA: number;
  dieB?: number;
  nat: number;
  total: number;
  modifier: number;
  advUsed: AdvType;
  crit: boolean;
  fumble: boolean;
  pass: boolean | null;
};

function rollDie(): number {
  return 1 + Math.floor(Math.random() * 20);
}

/** d20 attack/check/save roll with optional advantage (matches Session.jsx prototype). */
export function rollD20(input: RollD20Input = {}): RollD20Result {
  const adv = input.adv ?? 'norm';
  const mod = input.modifier ?? 0;
  const vs = input.vs ?? null;

  const dieA = rollDie();
  const dieB = adv !== 'norm' ? rollDie() : undefined;
  const nat =
    adv === 'adv' && dieB != null
      ? Math.max(dieA, dieB)
      : adv === 'dis' && dieB != null
        ? Math.min(dieA, dieB)
        : dieA;
  const total = nat + mod;

  return {
    dieA,
    dieB,
    nat,
    total,
    modifier: mod,
    advUsed: adv,
    crit: nat === 20,
    fumble: nat === 1,
    pass: vs != null ? total >= vs : null,
  };
}

export function rollButtonLabel(
  adv: AdvType,
  modifier: number,
  stat?: string,
): string {
  const modStr = modifier >= 0 ? `+${modifier}` : `${modifier}`;
  const dice =
    adv === 'adv' ? '2d20↑' : adv === 'dis' ? '2d20↓' : 'd20';
  return `Roll ${dice} ${modStr}${stat ? ` ${stat}` : ''}`;
}

export function rollBreakdownText(
  result: RollD20Result,
  stat?: string,
): string {
  const modStr = result.modifier >= 0 ? `+${result.modifier}` : `${result.modifier}`;
  const statLabel = stat ?? 'mod';
  if (result.advUsed !== 'norm' && result.dieB != null) {
    const take = result.advUsed === 'adv' ? 'higher' : 'lower';
    return `2d20 (${result.advUsed === 'adv' ? 'Adv' : 'Dis'}) = ${result.dieA}, ${result.dieB} · take ${take} ${result.nat} · ${modStr} ${statLabel}`;
  }
  return `d20 = ${result.nat} · ${modStr} ${statLabel}`;
}

export function rollVerdictText(result: RollD20Result): string | null {
  if (result.crit) return 'Critical hit';
  if (result.fumble) return 'Fumble';
  if (result.pass === true) return 'Success';
  if (result.pass === false) return 'Miss';
  return null;
}
