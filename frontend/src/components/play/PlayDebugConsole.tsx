import { useMemo, useState } from 'react';
import {
  DEV_DEBUG_ACTIONS,
  type DevDebugAction,
  type DevDebugActionId,
} from '@/lib/play/devDebugConsole';
import { cn } from '@/lib/utils';

type PlayDebugConsoleProps = {
  open: boolean;
  onClose: () => void;
  onAction: (id: DevDebugActionId) => void;
  status?: string;
};

const CATEGORIES = [
  'WS-7 flows',
  'Combat & vitals',
  'Character',
  'Transcript',
  'UI panels',
] as const;

export function PlayDebugConsole({
  open,
  onClose,
  onAction,
  status,
}: PlayDebugConsoleProps) {
  const [collapsed, setCollapsed] = useState(false);

  const byCategory = useMemo(() => {
    const map = new Map<string, DevDebugAction[]>();
    for (const cat of CATEGORIES) {
      map.set(
        cat,
        DEV_DEBUG_ACTIONS.filter((a) => a.category === cat),
      );
    }
    return map;
  }, []);

  if (!open) return null;

  return (
    <div
      className={cn(
        'play-debug-console',
        collapsed && 'play-debug-console-collapsed',
      )}
      role="region"
      aria-label="Play debug console"
    >
      <header className="play-debug-console-head">
        <div className="min-w-0">
          <p className="play-debug-console-title">Play debug</p>
          {status ? (
            <p className="play-debug-console-status">{status}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            className="play-debug-console-iconbtn"
            aria-label={collapsed ? 'Expand' : 'Collapse'}
            onClick={() => setCollapsed((v) => !v)}
          >
            {collapsed ? '▣' : '▢'}
          </button>
          <button
            type="button"
            className="play-debug-console-iconbtn"
            aria-label="Hide debug console"
            onClick={onClose}
          >
            ×
          </button>
        </div>
      </header>

      {!collapsed ? (
        <div className="play-debug-console-body">
          {CATEGORIES.map((cat) => {
            const actions = byCategory.get(cat) ?? [];
            if (actions.length === 0) return null;
            return (
              <section key={cat} className="play-debug-console-section">
                <p className="play-debug-console-cat">{cat}</p>
                <div className="play-debug-console-grid">
                  {actions.map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      className="play-debug-console-btn"
                      title={action.hint}
                      onClick={() => onAction(action.id)}
                    >
                      <span className="play-debug-console-btn-label">
                        {action.label}
                      </span>
                      <span className="play-debug-console-btn-hint">
                        {action.hint}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
