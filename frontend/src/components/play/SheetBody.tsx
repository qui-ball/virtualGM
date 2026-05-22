import { useMemo, useState } from 'react';
import type { CharacterView } from '@/lib/play/characterView';
import {
  SheetAbilitiesTab,
  SheetCombatTab,
  SheetInventoryTab,
  SheetNotesTab,
  SheetRestSection,
  SheetSpellsTab,
  SheetTabBar,
} from '@/components/play/sheet';
import { StatModifierRow } from '@/components/play/StatModifierRow';
import { buildSheetView, type SheetTabId } from '@/lib/play/sheetData';
import type { CharacterState } from '@/types';
import { cn } from '@/lib/utils';

type SheetBodyProps = {
  character: CharacterView;
  characterState: CharacterState | null;
  /** Pixel height of the sheet body (phase 2 pull). */
  height?: number;
  dragging?: boolean;
  loading?: boolean;
  onShortRest?: () => void;
  onLongRest?: () => void;
  className?: string;
};

const TAB_PANEL_LABELS: Record<SheetTabId, string> = {
  combat: 'Combat',
  abilities: 'Abilities',
  spells: 'Spells',
  inventory: 'Inventory',
  notes: 'Notes',
};

/** Phase 2 pull-sheet: ability modifiers, tabs, and rest controls (WS-6). */
export function SheetBody({
  character,
  characterState,
  height = 0,
  dragging = false,
  loading = false,
  onShortRest,
  onLongRest,
  className,
}: SheetBodyProps) {
  const sheet = useMemo(
    () =>
      characterState
        ? buildSheetView(characterState)
        : buildSheetView({
            name: character.name,
            character_class: character.classLabel.toLowerCase(),
            level: character.level,
            xp: character.xp,
            stats: {
              might: character.stats.find((s) => s.key === 'might')?.mod ?? 0,
              finesse:
                character.stats.find((s) => s.key === 'finesse')?.mod ?? 0,
              wit: character.stats.find((s) => s.key === 'wit')?.mod ?? 0,
              presence:
                character.stats.find((s) => s.key === 'presence')?.mod ?? 0,
            },
            hp: character.hp,
            hp_max: character.hpMax,
            evasion: character.evasion,
            mana: character.mana,
            mana_max: character.manaMax,
            conditions: character.conditions.map((c) => c.id),
            class_abilities: character.classAbilities,
            spells_known: character.spellsKnown,
            gold: character.gold,
            coin_purse: {
              copper:
                character.coins.find((c) => c.key === 'copper')?.amount ?? 0,
              silver:
                character.coins.find((c) => c.key === 'silver')?.amount ?? 0,
              gold: character.coins.find((c) => c.key === 'gold')?.amount ?? 0,
              platinum:
                character.coins.find((c) => c.key === 'platinum')?.amount ?? 0,
            },
            inventory: character.inventory,
            equipped_weapon: character.inventory[0] ?? null,
            equipped_armor: null,
          }),
    [character, characterState],
  );

  const [tab, setTab] = useState<SheetTabId>('combat');

  const activeTab = sheet.tabs.includes(tab) ? tab : sheet.tabs[0];

  const collapsed = height < 4;

  return (
    <div
      className={cn(
        'play-sheet-body shrink-0',
        dragging && 'play-sheet-body-dragging',
        className,
      )}
      style={{ height }}
      aria-hidden={collapsed}
    >
      <div className="play-sheet-body-inner">
        <StatModifierRow character={character} />
        <SheetTabBar tabs={sheet.tabs} active={activeTab} onChange={setTab} />

        <div
          className="play-sheet-scroll min-h-0 flex-1"
          role="tabpanel"
          aria-label={TAB_PANEL_LABELS[activeTab]}
        >
          {activeTab === 'combat' ? <SheetCombatTab sheet={sheet} /> : null}
          {activeTab === 'abilities' ? (
            <SheetAbilitiesTab sheet={sheet} classLabel={character.classLabel} />
          ) : null}
          {activeTab === 'spells' ? <SheetSpellsTab sheet={sheet} /> : null}
          {activeTab === 'inventory' ? (
            <SheetInventoryTab sheet={sheet} coins={character.coins} />
          ) : null}
          {activeTab === 'notes' ? (
            <SheetNotesTab characterName={character.name} />
          ) : null}
        </div>

        <SheetRestSection
          onShortRest={() => onShortRest?.()}
          onLongRest={() => onLongRest?.()}
          disabled={loading}
        />
      </div>
    </div>
  );
}
