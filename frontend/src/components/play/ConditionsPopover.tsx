import { useEffect, useRef, useState } from 'react';
import {
  activeConditionInfos,
  ALL_CONDITIONS,
  conditionIcon,
  CONDITION_CATALOG,
} from '@/lib/play/conditions';
import { cn } from '@/lib/utils';
import type { ConditionName } from '@/types';

type ConditionsPopoverProps = {
  open: boolean;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  active: ConditionName[];
  onClose: () => void;
};

export function ConditionsPopover({
  open,
  anchorRef,
  active,
  onClose,
}: ConditionsPopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<{
    left: number;
    bottom: number;
    width: number;
  } | null>(null);

  useEffect(() => {
    if (!open || !anchorRef.current) {
      setStyle(null);
      return;
    }
    const place = () => {
      const rect = anchorRef.current!.getBoundingClientRect();
      const width = Math.min(288, window.innerWidth - 16);
      let left = rect.left + rect.width / 2 - width / 2;
      left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
      const bottom = window.innerHeight - rect.top + 8;
      setStyle({ left, bottom, width });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onPointer = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        panelRef.current?.contains(target) ||
        anchorRef.current?.contains(target)
      ) {
        return;
      }
      onClose();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointer);
    };
  }, [open, onClose, anchorRef]);

  if (!open || !style) return null;

  const activeSet = new Set(active);
  const activeInfos = activeConditionInfos(active);

  return (
    <div
      ref={panelRef}
      className="play-conditions-popover"
      role="dialog"
      aria-label="Active conditions"
      style={{
        left: style.left,
        bottom: style.bottom,
        width: style.width,
      }}
    >
      <p className="play-lbl mb-2">Conditions</p>
      {activeInfos.length === 0 ? (
        <p className="text-sm text-[var(--ink-3)]">No active conditions.</p>
      ) : (
        <ul className="play-conditions-popover-list">
          {activeInfos.map((info) => (
            <li key={info.id} className="play-conditions-popover-item">
              <span className="play-condition-icon-lg" aria-hidden>
                {conditionIcon(info.id)}
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-[var(--ink)]">{info.label}</p>
                <p className="mt-0.5 text-xs leading-snug text-[var(--ink-2)]">
                  {info.effect}
                </p>
                <p className="play-mono mt-1 text-[0.5625rem] text-[var(--ink-3)]">
                  Clear: {info.removal}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <details className="play-conditions-popover-all mt-3">
        <summary className="play-lbl cursor-pointer">All condition types</summary>
        <ul className="mt-2 space-y-1.5 text-xs text-[var(--ink-3)]">
          {ALL_CONDITIONS.map((id) => (
            <li
              key={id}
              className={cn(activeSet.has(id) && 'text-[var(--accent)]')}
            >
              <span className="mr-1.5" aria-hidden>
                {conditionIcon(id)}
              </span>
              {CONDITION_CATALOG[id].label}
              {activeSet.has(id) ? ' · active' : ''}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
