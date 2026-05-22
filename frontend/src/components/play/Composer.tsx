import { forwardRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { PlayIcon } from '@/components/play/PlayIcon';
import { cn } from '@/lib/utils';

type ComposerProps = {
  onSend: (text: string) => void;
  onPlusToggle?: () => void;
  plusOpen?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
};

export const Composer = forwardRef<HTMLFormElement, ComposerProps>(
  function Composer(
    {
      onSend,
      onPlusToggle,
      plusOpen = false,
      disabled = false,
      placeholder = 'Say or do something…',
      className,
    },
    ref,
  ) {
  const [text, setText] = useState('');

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    setText('');
    onSend(trimmed);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <form
      ref={ref}
      className={cn('play-composer shrink-0', className)}
      onSubmit={onSubmit}
      aria-label="Message composer"
    >
      <button
        type="button"
        className={cn(
          'play-composer-plus min-h-[44px] min-w-[44px]',
          plusOpen && 'play-composer-plus-open',
        )}
        aria-label={plusOpen ? 'Close menu' : 'More actions'}
        aria-expanded={plusOpen}
        disabled={disabled}
        onClick={onPlusToggle}
      >
        {plusOpen ? '×' : '+'}
      </button>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="play-composer-input min-h-[44px]"
        aria-label="Player message"
      />
      <button
        type="submit"
        className="play-composer-send min-h-[44px] min-w-[44px]"
        disabled={disabled || !text.trim()}
        aria-label="Send message"
      >
        <PlayIcon name="send" />
      </button>
    </form>
  );
  },
);
