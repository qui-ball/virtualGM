import { useEffect, useState } from 'react';
import { getStartingPackages } from '@/api/client';
import type { PackageSummary, PrebuiltCharacterSummary } from '@/types';
import type { FlowGender } from '@/lib/play/newCampaignFlow';
import { resolvedPrebuiltName } from '@/lib/play/newCampaignFlow';
import {
  genderOptionLabel,
  OnboardingCharacterCard,
  packageEquipmentLines,
} from '@/components/play/campaign/newCampaign/OnboardingCharacterCard';
import { cn } from '@/lib/utils';

type PrebuiltCharacterPickerProps = {
  templateSlug: string;
  prebuilts: PrebuiltCharacterSummary[];
  selectedId: string | null;
  gender: FlowGender;
  loading?: boolean;
  error?: string | null;
  onSelect: (prebuilt: PrebuiltCharacterSummary) => void;
  onGenderChange: (gender: FlowGender) => void;
};

export function PrebuiltCharacterPicker({
  templateSlug,
  prebuilts,
  selectedId,
  gender,
  loading,
  error,
  onSelect,
  onGenderChange,
}: PrebuiltCharacterPickerProps) {
  const [packagesById, setPackagesById] = useState<
    Record<string, PackageSummary>
  >({});

  useEffect(() => {
    if (!templateSlug || !prebuilts.length) {
      setPackagesById({});
      return;
    }
    let cancelled = false;
    void getStartingPackages(templateSlug)
      .then((res) => {
        if (cancelled) return;
        const map: Record<string, PackageSummary> = {};
        for (const pkg of res.packages) {
          map[pkg.id] = pkg;
        }
        setPackagesById(map);
      })
      .catch(() => {
        if (!cancelled) setPackagesById({});
      });
    return () => {
      cancelled = true;
    };
  }, [templateSlug, prebuilts.length]);

  if (loading) {
    return (
      <p className="text-sm text-[var(--ink-3)]">Loading characters…</p>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-[var(--bad)]" role="alert">
        {error}
      </p>
    );
  }

  const selected = prebuilts.find((p) => p.id === selectedId) ?? null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Gender">
        {(['female', 'male'] as const).map((g) => (
          <button
            key={g}
            type="button"
            className={cn(
              'play-select-card flex min-h-[48px] items-center justify-center text-center',
              gender === g && 'play-select-card-on',
            )}
            aria-pressed={gender === g}
            onClick={() => onGenderChange(g)}
          >
            {genderOptionLabel(g)}
          </button>
        ))}
      </div>

      <div
        className="flex flex-col gap-3"
        role="listbox"
        aria-label="Prebuilt characters"
      >
        {prebuilts.map((p) => {
          const pkg = p.default_package_id
            ? packagesById[p.default_package_id]
            : undefined;
          return (
            <OnboardingCharacterCard
              key={p.id}
              name={resolvedPrebuiltName(p, gender)}
              classId={p.class_id}
              gender={gender}
              raceId={p.race_id}
              level={p.level}
              hook={p.hook}
              packageLabel={pkg?.label}
              equipment={packageEquipmentLines(pkg)}
              selected={p.id === selectedId}
              onSelect={() => onSelect(p)}
            />
          );
        })}
      </div>

      {selected ? (
        <p className="text-sm text-[var(--ink-3)]">
          Starting as{' '}
          <span className="font-medium text-[var(--ink)]">
            {resolvedPrebuiltName(selected, gender)}
          </span>
          .
        </p>
      ) : null}
    </div>
  );
}
