import { useEffect, useMemo, useRef, useState } from 'react';
import type { CharacterView } from '@/lib/play/characterView';
import { buildSheetView } from '@/lib/play/sheetData';
import type { SpellTierName } from '@/lib/play/sheetCatalog';
import {
  canAffordCast,
  castTierOptions,
  castableSpellsForTier,
  defaultCastTier,
  type CastTrayResult,
} from '@/lib/play/castFlow';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { PlayIcon } from '@/components/play/PlayIcon';
import { Pill } from '@/components/play/Pill';
import { SegmentedControl } from '@/components/play/SegmentedControl';
import { cn } from '@/lib/utils';
import type { CharacterState } from '@/types';

type CastTrayProps = {
  open: boolean;
  character: CharacterView;
  characterState: CharacterState;
  onCast: (result: CastTrayResult) => void;
  onClose: () => void;
};

export function CastTray({
  open,
  character,
  characterState,
  onCast,
  onClose,
}: CastTrayProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  useFocusTrap(sheetRef, open);

  const sheet = useMemo(() => buildSheetView(characterState), [characterState]);
  const tierOptions = useMemo(
    () => castTierOptions(characterState),
    [characterState],
  );
  const [tier, setTier] = useState<SpellTierName>(() =>
    defaultCastTier(characterState),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const tierMeta = tierOptions.find((t) => t.id === tier);
  const spells = castableSpellsForTier(sheet, tier);
  const selected = spells.find((s) => s.id === selectedId) ?? spells[0];
  const manaCurrent = characterState.mana ?? 0;
  const manaMax = characterState.mana_max ?? 0;
  const cost = tierMeta?.cost ?? 1;
  const canCast =
    !tierMeta?.locked &&
    selected != null &&
    canAffordCast(manaCurrent, cost);

  const witMod =
    character.stats.find((s) => s.key === 'wit')?.mod ?? 0;
  const preMod =
    character.stats.find((s) => s.key === 'presence')?.mod ?? 0;
  const castMod =
    characterState.character_class.toLowerCase() === 'bard' ? preMod : witMod;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      setTier(defaultCastTier(characterState));
      setSelectedId(null);
    }
  }, [open, characterState]);

  useEffect(() => {
    if (spells.length > 0 && !selectedId) {
      setSelectedId(spells[0].id);
    }
  }, [spells, selectedId]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="play-sheet-backdrop"
        aria-label="Close cast tray"
        onClick={onClose}
      />
      <div
        ref={sheetRef}
        className="play-bottom-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Cast spell"
      >
        <div className="play-bottom-sheet-handle" aria-hidden />
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="play-lbl">Cast spell</p>
            <h2 className="play-h-display text-xl">Choose tier</h2>
          </div>
          <Pill variant="tint" className="play-mono text-[0.6875rem]">
            MP {manaCurrent}/{manaMax}
          </Pill>
        </div>

        <SegmentedControl
          className="mt-2"
          options={tierOptions.map((t) => ({
            id: t.id,
            label: t.locked ? `${t.label} ✗` : t.label,
            disabled: t.locked,
          }))}
          value={tier}
          onChange={setTier}
          aria-label="Spell tier"
        />

        {tierMeta?.locked && tierMeta.lockReason ? (
          <p className="play-mono mt-2 text-[0.5625rem] text-[var(--ink-3)]">
            {tierMeta.label} locked · {tierMeta.lockReason} (you: Lv{' '}
            {characterState.level})
          </p>
        ) : null}

        <div className="mt-3 max-h-[40vh] space-y-1.5 overflow-y-auto">
          {spells.length === 0 ? (
            <p className="text-sm text-[var(--ink-3)]">
              No castable spells in this tier.
            </p>
          ) : (
            spells.map((s) => (
              <button
                key={s.id}
                type="button"
                className={cn(
                  'play-cast-spell-row w-full text-left',
                  selectedId === s.id && 'play-cast-spell-row-on',
                )}
                onClick={() => setSelectedId(s.id)}
              >
                <span className="font-semibold text-sm">{s.name}</span>
                <span className="play-mono text-[0.5625rem] text-[var(--ink-3)]">
                  {s.cost} MP · {s.description.slice(0, 48)}
                  {s.description.length > 48 ? '…' : ''}
                </span>
              </button>
            ))
          )}
        </div>

        <button
          type="button"
          className="play-btn-primary mt-3 w-full min-h-[44px]"
          disabled={!canCast || !selected}
          onClick={() => {
            if (!selected) return;
            onCast({
              spellId: selected.id,
              spellName: selected.name,
              tier,
              cost,
              modifier: castMod,
            });
          }}
        >
          <PlayIcon name="bolt" className="size-[18px]" />
          Cast {selected?.name ?? 'spell'} ({cost} MP)
        </button>
        <p className="play-lbl mt-2 text-center text-[var(--ink-4)]">
          Tier locks match class + level · cast via session API
        </p>
      </div>
    </>
  );
}
