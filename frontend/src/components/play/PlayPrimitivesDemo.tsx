import { useState } from 'react';
import { demoCharacterView } from '@/lib/play/characterView';
import { CharacterVitalsCard } from '@/components/play/CharacterVitalsCard';
import { Pill } from '@/components/play/Pill';
import { PlayIcon } from '@/components/play/PlayIcon';
import { SegmentedControl } from '@/components/play/SegmentedControl';
import { StatChip } from '@/components/play/StatChip';
import { VitalBar } from '@/components/play/VitalBar';
import { VitalStrip } from '@/components/play/VitalStrip';

const SEG_OPTIONS = [
  { id: 'combat' as const, label: 'Combat' },
  { id: 'spells' as const, label: 'Spells' },
  { id: 'inv' as const, label: 'Inv' },
];

/**
 * Visual regression row for WS-2 play primitives (320px-friendly).
 */
export function PlayPrimitivesDemo() {
  const [tab, setTab] = useState<'combat' | 'spells' | 'inv'>('combat');
  const character = demoCharacterView();

  return (
    <section className="mx-auto max-w-sm space-y-6" aria-label="Play UI primitives">
      <header className="space-y-1">
        <h2 className="play-h-display text-base">Play primitives</h2>
        <p className="text-sm text-muted-foreground">
          WS-2 components at mobile density. Resize to 320px to verify layout.
        </p>
      </header>

      <VitalStrip character={character} />

      <CharacterVitalsCard character={character} />

      <div className="play-panel space-y-3 p-3">
        <p className="play-lbl">Bars & chips</p>
        <VitalBar value={18} max={22} kind="hp" />
        <VitalBar value={6} max={9} kind="mp" />
        <div className="grid grid-cols-4 gap-1.5">
          <StatChip label="Mig" value="-1" variant="default" />
          <StatChip label="Wit" value="+2" variant="hot" />
          <StatChip label="HP" value="18" variant="warn" />
          <StatChip label="!" value="!" variant="warn" />
        </div>
      </div>

      <div className="space-y-2">
        <p className="play-lbl">Pills</p>
        <div className="flex flex-wrap gap-2">
          <Pill>Default</Pill>
          <Pill variant="tint">DC 13</Pill>
          <Pill variant="solid">Resume</Pill>
          <Pill variant="danger">Locked</Pill>
        </div>
      </div>

      <SegmentedControl
        options={SEG_OPTIONS}
        value={tab}
        onChange={setTab}
        aria-label="Sheet tabs"
      />

      <div className="flex flex-wrap gap-3">
        {(
          ['bolt', 'menu', 'send', 'shield', 'swords', 'scroll'] as const
        ).map((name) => (
          <span
            key={name}
            className="inline-flex items-center gap-1 text-[var(--accent)]"
          >
            <PlayIcon name={name} />
            <span className="play-mono text-[0.625rem] uppercase">{name}</span>
          </span>
        ))}
      </div>
    </section>
  );
}
