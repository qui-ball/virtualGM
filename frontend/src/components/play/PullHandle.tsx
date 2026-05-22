import { forwardRef, type KeyboardEvent, type PointerEvent } from 'react';
import { cn } from '@/lib/utils';

type PullHandleProps = {
  openness: number;
  sheetOpen: boolean;
  dragging?: boolean;
  onPointerDown: (e: PointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (e: PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (e: PointerEvent<HTMLButtonElement>) => void;
  onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => void;
  className?: string;
};

export const PullHandle = forwardRef<HTMLButtonElement, PullHandleProps>(
  function PullHandle(
    {
      openness,
      sheetOpen,
      dragging = false,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onKeyDown,
      className,
    },
    ref,
  ) {
    const hint =
      openness > 0.5
        ? '▲ pull up to close'
        : openness > 0
          ? '▾ keep pulling…'
          : '▼ pull for sheet';

    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          'play-pull-handle shrink-0',
          openness > 0 && 'play-pull-handle-active',
          dragging && 'play-pull-handle-dragging',
          className,
        )}
        aria-label={
          sheetOpen
            ? 'Drag up to close character sheet'
            : 'Drag down to open character sheet'
        }
        aria-expanded={sheetOpen}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
      >
        <span className="play-pull-grip" aria-hidden />
        <span className="play-pull-hint">{hint}</span>
      </button>
    );
  },
);
