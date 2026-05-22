export type HpChipVariant = 'default' | 'warn' | 'bad';

export function hpChipVariant(hp: number, hpMax: number): HpChipVariant {
  if (hpMax <= 0) {
    return 'default';
  }
  const ratio = hp / hpMax;
  if (ratio <= 0.3) {
    return 'bad';
  }
  if (ratio <= 0.6) {
    return 'warn';
  }
  return 'default';
}
