import type { ReactNode } from 'react';
import type { PlayIconName } from '@/components/play/PlayIcon';
import type { RpgThemeId } from '@/theme/registry';
import { getRpgThemeProfile } from '@/theme/profiles';

type IconPathSet = Record<PlayIconName, ReactNode>;

function stroke(sw: number) {
  return {
    stroke: 'currentColor',
    strokeWidth: sw,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
}

const STORM_ICONS: IconPathSet = {
  bolt: (
    <path
      d="M13 1L3 15h7l-2 9 11-14h-7l1-9z"
      fill="currentColor"
      fillOpacity={0.2}
      {...stroke(1.4)}
    />
  ),
  shield: (
    <path d="M12 2l9 3.5v6c0 5-4 8.5-9 9.5-5-1-9-4.5-9-9.5v-6L12 2z" {...stroke(1.4)} />
  ),
  swords: (
    <>
      <path d="M15 3l6 6-2.5 2.5-6-6L15 3zM3 21l6-6-2-2-6 6 2 2z" {...stroke(1.4)} />
      <path d="M10 14l4-4" {...stroke(1.4)} />
    </>
  ),
  scroll: (
    <>
      <path d="M6 4h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z" {...stroke(1.4)} />
      <path d="M8 9h8M8 13h8M8 17h6" {...stroke(1.4)} />
    </>
  ),
  home: <path d="M4 11.5L12 4l8 7.5V20a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1v-8.5z" {...stroke(1.4)} />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" {...stroke(1.7)} />,
  send: (
    <path
      d="M2 12l20-10-8 20-4-8-8-2z"
      fill="currentColor"
      fillOpacity={0.18}
      {...stroke(1.4)}
    />
  ),
  close: <path d="M6 6l12 12M18 6L6 18" {...stroke(1.7)} />,
  swap: <path d="M7 4l-3 3 3 3M4 7h12M17 14l3 3-3 3M20 17H8" {...stroke(1.4)} />,
};

const NECROPOLIS_ICONS: IconPathSet = {
  bolt: (
    <path
      d="M12 2c0 4-3 6-3 10h3l-1 8c4-6 6-9 6-14-3 0-4-2-5-4z"
      fill="currentColor"
      fillOpacity={0.12}
      {...stroke(1.5)}
    />
  ),
  shield: (
    <>
      <path d="M12 3l8 3v6c0 4-3.5 7.5-8 8.5-4.5-1-8-4.5-8-8.5V6l8-3z" {...stroke(1.5)} />
      <circle cx="12" cy="11" r="2.5" {...stroke(1.2)} />
      <path d="M10.5 13.5h3" {...stroke(1.2)} />
    </>
  ),
  swords: (
    <>
      <path d="M14 4l6 6-1.5 1.5M4 20l6-6" {...stroke(1.5)} />
      <path d="M10 14l4-4M16 5l3-3M5 19l-3 3" {...stroke(1.5)} />
    </>
  ),
  scroll: (
    <>
      <path d="M7 5c-1 0-2 1-2 2v11c0 1 1 2 2 2h10c1 0 2-1 2-2V7c0-1-1-2-2-2" {...stroke(1.5)} />
      <path d="M7 5c2-1 4-1 6 0s4 1 6 0" {...stroke(1.5)} />
      <path d="M8 11h8M8 15h6" {...stroke(1.5)} />
    </>
  ),
  home: (
    <path
      d="M12 3l-1 2h-5v15h14V5h-5l-1-2-2 0zM10 11h4v7h-4v-7z"
      fill="currentColor"
      fillOpacity={0.08}
      {...stroke(1.5)}
    />
  ),
  menu: <path d="M4 8h16M4 12h12M4 16h16" {...stroke(1.7)} />,
  send: <path d="M4 6l16 6-16 6 4-6-4-6z" {...stroke(1.5)} />,
  close: <path d="M7 7l10 10M17 7L7 17" {...stroke(1.7)} />,
  swap: <path d="M6 5l-2 2 2 2M4 7h10M18 15l2 2-2 2M20 17H10" {...stroke(1.5)} />,
};

const OBSIDIAN_ICONS: IconPathSet = {
  bolt: (
    <path
      d="M14 2L5 14h6l-1 8 10-13h-6l1-7z"
      fill="currentColor"
      fillOpacity={0.25}
      {...stroke(2)}
    />
  ),
  shield: (
    <path
      d="M12 2l10 4v6.5c0 5.5-4.5 9.5-10 10.5-5.5-1-10-5-10-10.5V6l10-4z"
      fill="currentColor"
      fillOpacity={0.1}
      {...stroke(2)}
    />
  ),
  swords: (
    <>
      <path d="M16 3l5 5-3 3-5-5 3-3zM3 21l6-6-3-3-6 6 3 3z" {...stroke(2)} />
      <path d="M9 15l6-6" {...stroke(2.2)} />
    </>
  ),
  scroll: (
    <>
      <rect x="5" y="4" width="14" height="16" rx="1" {...stroke(2)} />
      <path d="M8 9h8M8 13h8M8 17h5" {...stroke(2)} />
    </>
  ),
  home: <path d="M3 12l9-8 9 8v8a1 1 0 01-1 1h-6v-6h-4v6H4a1 1 0 01-1-1v-8z" {...stroke(2)} />,
  menu: <path d="M3 7h18M3 12h18M3 17h18" {...stroke(2)} />,
  send: (
    <path
      d="M3 12l18-8-7 18-4-7-7-3z"
      fill="currentColor"
      fillOpacity={0.22}
      {...stroke(2)}
    />
  ),
  close: <path d="M5 5l14 14M19 5L5 19" {...stroke(2)} />,
  swap: <path d="M6 3l-4 4 4 4M2 7h14M18 17l4 4-4 4M22 21H8" {...stroke(2)} />,
};

const MITHRIL_ICONS: IconPathSet = {
  bolt: (
    <path
      d="M12 3v5M12 8l-4 7h3l-1 6 6-9h-3l-1-4z"
      fill="none"
      {...stroke(1.2)}
    />
  ),
  shield: (
    <>
      <path d="M12 3.5l7.5 2.8v5.8c0 4.2-3.2 7.4-7.5 8.4-4.3-1-7.5-4.2-7.5-8.4V6.3L12 3.5z" {...stroke(1.2)} />
      <path d="M12 8v5M9.5 10.5h5" {...stroke(1.1)} />
    </>
  ),
  swords: (
    <>
      <path d="M14.5 4.5l5.5 5.5M4.5 19.5l5.5-5.5" {...stroke(1.2)} />
      <path d="M10.5 14.5l3-3" {...stroke(1.2)} />
    </>
  ),
  scroll: (
    <>
      <path d="M6.5 5h11c.8 0 1.5.7 1.5 1.5v11c0 .8-.7 1.5-1.5 1.5h-11c-.8 0-1.5-.7-1.5-1.5v-11c0-.8.7-1.5 1.5-1.5z" {...stroke(1.2)} />
      <path d="M9 9.5h6M9 12.5h6M9 15.5h4" {...stroke(1.2)} />
    </>
  ),
  home: <path d="M4 11.5L12 4.5l8 7v8.5a.5.5 0 01-.5.5h-5v-5.5h-3V20.5H4.5a.5.5 0 01-.5-.5V11.5z" {...stroke(1.2)} />,
  menu: <path d="M5 8h14M5 12h14M5 16h14" {...stroke(1.4)} />,
  send: <path d="M4 12l16-7-6 15-3-6-7-2z" {...stroke(1.2)} />,
  close: <path d="M7 7l10 10M17 7L7 17" {...stroke(1.4)} />,
  swap: <path d="M7.5 5l-2.5 2.5 2.5 2.5M5 7.5h11M16.5 16.5l2.5 2.5-2.5 2.5M19 19H8" {...stroke(1.2)} />,
};

const GRIMOIRE_ICONS: IconPathSet = {
  bolt: (
    <>
      <path d="M8 4h8v3H11v13l5-9H11V7H8V4z" fill="currentColor" fillOpacity={0.15} />
      <path d="M8 4h8v3H11v13l5-9H11V7H8V4z" {...stroke(1.5)} />
    </>
  ),
  shield: (
    <path d="M12 3l8 3.2v5.8c0 4.5-3.4 7.8-8 8.8-4.6-1-8-4.3-8-8.8V6.2L12 3z" {...stroke(1.5)} />
  ),
  swords: (
    <>
      <path d="M15 4l5 5-2 2-5-5 2-2zM4 20l5-5-2-2-5 5 2 2z" {...stroke(1.5)} />
      <path d="M10 14l4-4" {...stroke(1.5)} />
    </>
  ),
  scroll: (
    <>
      <path d="M8 4h9a2 2 0 012 2v1H8a1 1 0 00-1 1v10a1 1 0 001 1h9v1a2 2 0 01-2 2H8a2 2 0 01-2-2V6a2 2 0 012-2z" {...stroke(1.5)} />
      <path d="M8 7h10M8 11h8M8 15h6" {...stroke(1.5)} />
      <path d="M6 9c-1 0-2 .8-2 1.8v4.4c0 1 .9 1.8 2 1.8" {...stroke(1.5)} />
    </>
  ),
  home: (
    <>
      <path d="M5 10l7-6 7 6v9a1 1 0 01-1 1h-4v-5H10v5H6a1 1 0 01-1-1v-9z" {...stroke(1.5)} />
      <path d="M9 14h6" {...stroke(1.5)} />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" {...stroke(1.6)} />,
  send: (
    <>
      <path d="M4 18l6-12 2 6 6 2-14 4z" {...stroke(1.5)} />
      <path d="M10 12l4 2" {...stroke(1.5)} />
    </>
  ),
  close: <path d="M6 6l12 12M18 6L6 18" {...stroke(1.6)} />,
  swap: <path d="M7 4l-3 3 3 3M4 7h12M17 14l3 3-3 3M20 17H8" {...stroke(1.5)} />,
};

const ICON_SETS: Record<RpgThemeId, IconPathSet> = {
  storm: STORM_ICONS,
  necropolis: NECROPOLIS_ICONS,
  obsidian: OBSIDIAN_ICONS,
  mithril: MITHRIL_ICONS,
  grimoire: GRIMOIRE_ICONS,
};

export function getThemeIconPath(
  themeId: RpgThemeId,
  name: PlayIconName,
): ReactNode {
  return ICON_SETS[themeId][name];
}

export function getThemeIconStroke(themeId: RpgThemeId): number {
  return getRpgThemeProfile(themeId).iconStroke;
}
