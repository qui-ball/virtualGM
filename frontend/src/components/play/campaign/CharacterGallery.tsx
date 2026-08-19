import type { CampaignListItem } from '@/lib/play/campaignLobby';
import {
  canDeleteInactiveCharacter,
  partitionCharacterRoster,
} from '@/lib/play/campaignLobby';
import { CharacterRosterCard } from '@/components/play/campaign/CharacterRosterCard';
import { cn } from '@/lib/utils';

type CharacterGalleryProps = {
  campaigns: CampaignListItem[];
  onInspect: (campaign: CampaignListItem) => void;
  onRequestDelete?: (campaign: CampaignListItem) => void;
  className?: string;
};

/** Portrait gallery of playthrough heroes — active first, then inactive. */
export function CharacterGallery({
  campaigns,
  onInspect,
  onRequestDelete,
  className,
}: CharacterGalleryProps) {
  const { active, inactive } = partitionCharacterRoster(campaigns);

  if (campaigns.length === 0) {
    return (
      <section
        className={cn('play-panel play-panel-glow space-y-3 p-4', className)}
        aria-label="No characters"
      >
        <span className="play-lbl">Your heroes</span>
        <h2 className="play-h-display text-xl">No characters yet</h2>
        <p className="text-sm text-[var(--ink-3)]">
          Start a campaign to meet your first hero. Each playthrough has its
          own character.
        </p>
      </section>
    );
  }

  return (
    <div
      className={cn('flex flex-col gap-3', className)}
      aria-label="Characters"
    >
      {active.map((c) => (
        <CharacterRosterCard
          key={c.id}
          campaign={c}
          onInspect={() => onInspect(c)}
        />
      ))}
      {inactive.length > 0 ? (
        <>
          <div className="play-rune-divider">
            <span>Inactive</span>
          </div>
          {inactive.map((c) => (
            <CharacterRosterCard
              key={c.id}
              campaign={c}
              onInspect={() => onInspect(c)}
              onRequestDelete={
                onRequestDelete && canDeleteInactiveCharacter(c)
                  ? () => onRequestDelete(c)
                  : undefined
              }
            />
          ))}
        </>
      ) : null}
    </div>
  );
}
