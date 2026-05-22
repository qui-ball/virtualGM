import { useState } from 'react';
import { PlayShell } from '@/components/play';
import {
  CampaignLobby,
  CharacterSwitcherSheet,
  NewCampaignModal,
} from '@/components/play/campaign';
import {
  activeCampaign,
  findLobbyCharacter,
  getDefaultLobbyCharacterId,
  LOBBY_CHARACTERS,
  otherCampaigns,
} from '@/lib/play/campaignLobby';
import { ThemeSelect } from '@/theme';
import { useIsTabletOrUp } from '@/hooks';

/** Campaign lobby (/campaign) — WS-4 resume-first layout. */
export function CampaignPage() {
  const isTabletOrUp = useIsTabletOrUp();
  const [characterId, setCharacterId] = useState(getDefaultLobbyCharacterId);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [newCampaignOpen, setNewCampaignOpen] = useState(false);

  const characterOption =
    findLobbyCharacter(characterId) ?? LOBBY_CHARACTERS[0];

  return (
    <PlayShell>
      {!isTabletOrUp ? (
        <div className="flex min-h-[44px] shrink-0 items-center justify-end border-b border-[var(--panel-edge)] px-4 py-2">
          <ThemeSelect compact />
        </div>
      ) : null}

      <CampaignLobby
        character={characterOption.view}
        monogram={characterOption.monogram}
        activeCampaign={activeCampaign()}
        otherCampaigns={otherCampaigns()}
        onSwitchCharacter={() => setSwitcherOpen(true)}
        onNewCampaign={() => setNewCampaignOpen(true)}
      />

      <CharacterSwitcherSheet
        open={switcherOpen}
        characters={LOBBY_CHARACTERS}
        activeId={characterId}
        onSelect={setCharacterId}
        onClose={() => setSwitcherOpen(false)}
      />

      <NewCampaignModal
        open={newCampaignOpen}
        onClose={() => setNewCampaignOpen(false)}
      />
    </PlayShell>
  );
}
