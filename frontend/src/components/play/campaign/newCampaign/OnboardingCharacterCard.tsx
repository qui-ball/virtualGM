import type { FlowGender } from '@/lib/play/newCampaignFlow';
import { ClassGenderPortrait } from '@/components/play/campaign/newCampaign/ClassGenderPortrait';
import { cn } from '@/lib/utils';

export type OnboardingCharacterCardProps = {
  name: string;
  classId: string;
  gender: FlowGender;
  raceId?: string | null;
  level?: number;
  hook?: string | null;
  /** Optional secondary detail (e.g. ability scores on create confirm). */
  detail?: string | null;
  packageLabel?: string | null;
  equipment?: string[];
  /** Highlighted / selected appearance. */
  selected?: boolean;
  /** When set, renders as a selectable button. */
  onSelect?: () => void;
  className?: string;
};

/** Shared character summary card for prebuilt picker + confirm. */
export function OnboardingCharacterCard({
  name,
  classId,
  gender,
  raceId,
  level = 1,
  hook,
  detail,
  packageLabel,
  equipment = [],
  selected = false,
  onSelect,
  className,
}: OnboardingCharacterCardProps) {
  const body = (
    <>
      <ClassGenderPortrait
        classId={classId}
        gender={gender}
        className="w-16 min-h-[5.5rem] self-stretch"
      />
      <div className="min-w-0 flex-1 space-y-1 py-0.5">
        <div className="flex flex-wrap items-baseline gap-2">
          <h2 className="play-h-display text-lg">{name}</h2>
          <span className="play-lbl capitalize">{classId}</span>
        </div>
        {hook ? <p className="text-sm text-[var(--ink-3)]">{hook}</p> : null}
        <p className="play-mono text-[0.625rem] text-[var(--ink-3)]">
          Level {level}
          {raceId ? ` · ${raceId}` : ''}
        </p>
        {detail ? (
          <p className="text-xs text-[var(--ink-3)]">{detail}</p>
        ) : null}
        {packageLabel ? (
          <p className="text-xs text-[var(--ink-2)]">
            <span className="play-lbl mr-1">Package</span>
            {packageLabel}
          </p>
        ) : null}
        {equipment.length ? (
          <p className="text-xs text-[var(--ink-3)]">
            <span className="play-lbl mr-1">Gear</span>
            {equipment.slice(0, 6).join(', ')}
            {equipment.length > 6 ? '…' : ''}
          </p>
        ) : null}
      </div>
    </>
  );

  const classes = cn(
    'play-select-card flex w-full items-stretch gap-3 text-left',
    selected && 'play-select-card-on',
    className,
  );

  if (onSelect) {
    return (
      <button
        type="button"
        role="option"
        aria-selected={selected}
        className={classes}
        onClick={onSelect}
      >
        {body}
      </button>
    );
  }

  return (
    <div className={classes} aria-label={name}>
      {body}
    </div>
  );
}

export function genderOptionLabel(gender: FlowGender): string {
  return gender === 'female' ? 'Female ♀' : 'Male ♂';
}

export function packageEquipmentLines(pkg: {
  equipped_weapon?: string | null;
  equipped_armor?: string | null;
  inventory: string[];
} | null | undefined): string[] {
  if (!pkg) return [];
  return [pkg.equipped_weapon, pkg.equipped_armor, ...pkg.inventory].filter(
    (x): x is string => Boolean(x),
  );
}
