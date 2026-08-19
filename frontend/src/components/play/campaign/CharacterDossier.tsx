import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { CharHeader } from '@/components/play/CharHeader';
import { PlayIcon } from '@/components/play/PlayIcon';
import { SheetBody } from '@/components/play/SheetBody';
import { ClassGenderPortrait } from '@/components/play/campaign/newCampaign/ClassGenderPortrait';
import {
  canDeleteInactiveCharacter,
  characterInactiveLabel,
  characterRosterStatus,
  characterViewFromListItem,
  isActiveCampaign,
  playSearchParamsFromCampaign,
  portraitGenderFromCampaign,
  type CampaignListItem,
} from '@/lib/play/campaignLobby';
import { PLAY_ROUTES } from '@/lib/play/routes';

type CharacterDossierProps = {
  campaign: CampaignListItem;
  onClose: () => void;
  onRequestDelete?: () => void;
  suppressEscape?: boolean;
};

/** Read-only character sheet overlay for a lobby playthrough hero. */
export function CharacterDossier({
  campaign,
  onClose,
  onRequestDelete,
  suppressEscape,
}: CharacterDossierProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, true);

  const character = characterViewFromListItem(campaign);
  const gender = portraitGenderFromCampaign(campaign);
  const status = characterRosterStatus(campaign);
  const canContinue = isActiveCampaign(campaign);
  const canDelete =
    Boolean(onRequestDelete) && canDeleteInactiveCharacter(campaign);
  const statusLabel =
    status === 'active' ? 'Character' : characterInactiveLabel(campaign);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !suppressEscape) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, suppressEscape]);

  return (
    <div className="play-modal-fullscreen" role="presentation">
      <div
        ref={dialogRef}
        className="play-modal-fullscreen-inner"
        role="dialog"
        aria-modal="true"
        aria-labelledby="character-dossier-title"
      >
        <header className="play-appbar shrink-0">
          <ClassGenderPortrait
            classId={campaign.characterClass}
            gender={gender}
            className={
              status === 'active'
                ? 'size-11 w-11 min-h-11 self-center'
                : 'size-11 w-11 min-h-11 self-center grayscale opacity-80'
            }
          />
          <div className="min-w-0 flex-1">
            <p
              className={
                status === 'fallen'
                  ? 'play-lbl text-[var(--bad)]'
                  : 'play-lbl text-[var(--accent)]'
              }
            >
              {statusLabel}
            </p>
            <h1 id="character-dossier-title" className="play-appbar-title">
              {campaign.characterName}
            </h1>
            <p className="play-appbar-sub truncate">
              {campaign.title} · Ch {campaign.chapter}
            </p>
          </div>
          <button
            type="button"
            className="play-iconbtn min-h-[44px] min-w-[44px]"
            aria-label="Close character"
            onClick={onClose}
          >
            <PlayIcon name="close" />
          </button>
        </header>

        <CharHeader character={character} height={88} />

        <SheetBody
          character={character}
          characterState={campaign.character}
          readOnly
        />

        <footer className="flex shrink-0 flex-col gap-3 border-t border-[var(--panel-edge)] p-4">
          {canContinue ? (
            <Link
              to={`${PLAY_ROUTES.session}?${playSearchParamsFromCampaign(campaign)}`}
              className="play-btn-primary flex min-h-[44px] flex-1 items-center justify-center overflow-hidden px-3"
            >
              <span className="truncate">Continue in {campaign.title}</span>
            </Link>
          ) : (
            <>
              <p className="text-sm text-[var(--ink-3)]">
                {status === 'fallen'
                  ? `${campaign.characterName} fell in ${campaign.title}.`
                  : status === 'completed'
                    ? `${campaign.characterName} completed ${campaign.title}.`
                    : `This run of ${campaign.title} has ended.`}
              </p>
              {canDelete ? (
                <button
                  type="button"
                  className="play-btn-ghost min-h-[44px] text-[var(--bad)]"
                  onClick={onRequestDelete}
                >
                  Delete character
                </button>
              ) : null}
            </>
          )}
        </footer>
      </div>
    </div>
  );
}
