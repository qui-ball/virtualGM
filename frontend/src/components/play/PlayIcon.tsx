import type { ReactNode, SVGProps } from 'react';
import { cn } from '@/lib/utils';

export type PlayIconName =
  | 'bolt'
  | 'shield'
  | 'swords'
  | 'scroll'
  | 'home'
  | 'menu'
  | 'send'
  | 'close'
  | 'swap';

type PlayIconProps = SVGProps<SVGSVGElement> & {
  name: PlayIconName;
};

const paths: Record<PlayIconName, ReactNode> = {
  bolt: (
    <path
      d="M13 2L4 14h6l-1 8 9-12h-6l1-8z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      fill="currentColor"
      fillOpacity={0.15}
    />
  ),
  shield: (
    <path
      d="M12 3l8 3v6c0 4.5-3.5 8-8 9-4.5-1-8-4.5-8-9V6l8-3z"
      stroke="currentColor"
      strokeWidth="1.5"
    />
  ),
  swords: (
    <path
      d="M14 4l6 6-2 2-6-6 2-2zM4 20l6-6-2-2-6 6 2 2zM10 14l4-4"
      stroke="currentColor"
      strokeWidth="1.5"
    />
  ),
  scroll: (
    <>
      <rect
        x="4"
        y="4"
        width="16"
        height="16"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M8 9h8M8 13h8M8 17h5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </>
  ),
  home: (
    <path
      d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-7H10v7H4a1 1 0 01-1-1v-9z"
      stroke="currentColor"
      strokeWidth="1.5"
    />
  ),
  menu: (
    <path
      d="M4 7h16M4 12h16M4 17h16"
      stroke="currentColor"
      strokeWidth="1.7"
    />
  ),
  send: (
    <path
      d="M3 12l18-9-7 18-3-7-8-2z"
      stroke="currentColor"
      strokeWidth="1.5"
      fill="currentColor"
      fillOpacity={0.2}
    />
  ),
  close: (
    <path
      d="M6 6l12 12M18 6L6 18"
      stroke="currentColor"
      strokeWidth="1.7"
    />
  ),
  swap: (
    <path
      d="M7 4l-3 3 3 3M4 7h12M17 14l3 3-3 3M20 17H8"
      stroke="currentColor"
      strokeWidth="1.5"
    />
  ),
};

export function PlayIcon({ name, className, ...props }: PlayIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn('size-[18px] shrink-0', className)}
      aria-hidden
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
