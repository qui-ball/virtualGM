type SheetRestSectionProps = {
  onShortRest: () => void;
  onLongRest: () => void;
  disabled?: boolean;
};

export function SheetRestSection({
  onShortRest,
  onLongRest,
  disabled = false,
}: SheetRestSectionProps) {
  return (
    <section className="play-sheet-rest shrink-0" aria-label="Rest">
      <span className="play-sheet-rest-label play-lbl">Rest</span>
      <button
        type="button"
        className="play-sheet-rest-btn"
        disabled={disabled}
        onClick={onShortRest}
        aria-label="Short rest — plus HP, time minus one"
      >
        <span className="play-sheet-rest-glyph" aria-hidden>
          ☼
        </span>
        <span className="play-sheet-rest-text">
          <span className="play-sheet-rest-title">Short</span>
          <span className="play-sheet-rest-hint">+HP · t−1</span>
        </span>
      </button>
      <button
        type="button"
        className="play-sheet-rest-btn"
        disabled={disabled}
        onClick={onLongRest}
        aria-label="Long rest — HP and MP full, time minus five"
      >
        <span className="play-sheet-rest-glyph" aria-hidden>
          ☾
        </span>
        <span className="play-sheet-rest-text">
          <span className="play-sheet-rest-title">Long</span>
          <span className="play-sheet-rest-hint">full · t−5</span>
        </span>
      </button>
    </section>
  );
}
