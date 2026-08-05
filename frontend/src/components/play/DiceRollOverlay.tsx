import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  registerDiceAnimationDismiss,
  registerDiceAnimationPlayer,
} from '@/lib/play/diceAnimation';
import { cn } from '@/lib/utils';

type DiceBoxInstance = {
  initialize: () => Promise<void>;
  roll: (notation: string) => Promise<unknown>;
  clearDice: () => void;
};

/**
 * Fullscreen portal that hosts `@drdreo/dice-box-threejs` and registers a
 * player for {@link playDiceAnimation}. Mount once in the play session.
 */
export function DiceRollOverlay() {
  const containerRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<DiceBoxInstance | null>(null);
  const initPromiseRef = useRef<Promise<DiceBoxInstance> | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const ensureBox = async (): Promise<DiceBoxInstance> => {
      if (boxRef.current) return boxRef.current;
      if (initPromiseRef.current) return initPromiseRef.current;

      const el = containerRef.current;
      if (!el) {
        throw new Error('dice overlay container missing');
      }

      initPromiseRef.current = (async () => {
        const mod = await import('@drdreo/dice-box-threejs');
        const DiceBox = mod.default;
        const box = new DiceBox(el, {
          assetPath: '/',
          gravity_multiplier: 400,
          light_intensity: 0.85,
          strength: 1.2,
          shadows: true,
          theme_colorset: 'bronze',
          theme_material: 'glass',
          theme_texture: '',
          sounds: true,
          volume: 70,
          sound_dieMaterial: 'plastic',
          theme_surface: 'green-felt',
        }) as DiceBoxInstance;
        await box.initialize();
        boxRef.current = box;
        return box;
      })();

      try {
        return await initPromiseRef.current;
      } catch (err) {
        initPromiseRef.current = null;
        throw err;
      }
    };

    const play = async (notation: string) => {
      if (cancelled) return;
      setActive(true);
      try {
        const box = await ensureBox();
        if (cancelled) return;
        try {
          box.clearDice();
        } catch {
          // First roll may have nothing to clear.
        }
        await box.roll(notation);
        // Brief linger so settled faces are readable before dismiss.
        await new Promise<void>((r) => {
          window.setTimeout(r, 450);
        });
      } finally {
        if (!cancelled) setActive(false);
      }
    };

    registerDiceAnimationPlayer(play);
    registerDiceAnimationDismiss(() => {
      setActive(false);
    });

    return () => {
      cancelled = true;
      registerDiceAnimationPlayer(null);
      registerDiceAnimationDismiss(null);
      boxRef.current = null;
      initPromiseRef.current = null;
    };
  }, []);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={cn('play-dice-overlay', active && 'play-dice-overlay-active')}
      aria-hidden={!active}
    >
      <div
        ref={containerRef}
        className="play-dice-overlay-stage"
        data-testid="dice-roll-stage"
      />
    </div>,
    document.body,
  );
}
