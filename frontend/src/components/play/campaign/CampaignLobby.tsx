import type { CampaignListItem } from '@/lib/play/campaignLobby';
import type { CharacterView } from '@/lib/play/characterView';
import { ActiveCampaignCard } from '@/components/play/campaign/ActiveCampaignCard';
import { ActiveCharacterCard } from '@/components/play/campaign/ActiveCharacterCard';
import { CampaignAppBar } from '@/components/play/campaign/CampaignAppBar';
import { CampaignRow } from '@/components/play/campaign/CampaignRow';
import { ThemePickerRpg } from '@/theme';
import { cn } from '@/lib/utils';

type CampaignLobbyProps = {
  character: CharacterView;
  monogram: string;
  activeCampaign: CampaignListItem;
  otherCampaigns: CampaignListItem[];
  onSwitchCharacter: () => void;
  onNewCampaign: () => void;
  className?: string;
};

export function CampaignLobby({
  character,
  monogram,
  activeCampaign,
  otherCampaigns,
  onSwitchCharacter,
  onNewCampaign,
  className,
}: CampaignLobbyProps) {
  return (
    <div className={cn('relative flex min-h-0 flex-1 flex-col', className)}>
      <CampaignAppBar
        character={character}
        onSwitchCharacter={onSwitchCharacter}
      />

      <div className="play-lobby-scroll min-h-0 flex-1">
        <ActiveCampaignCard campaign={activeCampaign} />

        <ActiveCharacterCard
          character={character}
          monogram={monogram}
          onSwitch={onSwitchCharacter}
        />

        <div className="play-rune-divider">
          <span>Other campaigns</span>
        </div>

        <div className="flex flex-col gap-2">
          {otherCampaigns.map((c) => (
            <CampaignRow key={c.id} campaign={c} />
          ))}
        </div>

        <button
          type="button"
          className="play-btn-ghost w-full min-h-[44px]"
          onClick={onNewCampaign}
        >
          + New Campaign
        </button>

        <div className="play-rune-divider">
          <span>Theme</span>
        </div>

        <ThemePickerRpg variant="play" />
      </div>
    </div>
  );
}
