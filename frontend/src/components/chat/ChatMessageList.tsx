import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/types';

type ChatMessageListProps = {
  messages: ChatMessage[];
};

const roleMeta: Record<
  ChatMessage['role'],
  { label: string; className: string }
> = {
  player: {
    label: 'You',
    className: 'bg-primary/10 text-foreground self-end',
  },
  gm: {
    label: 'GM',
    className: 'bg-muted text-foreground self-start',
  },
  system: {
    label: 'System',
    className: 'bg-transparent text-muted-foreground italic self-center text-center text-sm',
  },
};

export function ChatMessageList({ messages }: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
      {messages.map((msg, i) => {
        const meta = roleMeta[msg.role];
        return (
          <div
            key={i}
            className={cn(
              'flex max-w-[85%] flex-col rounded-lg px-4 py-2',
              meta.className,
            )}
          >
            {msg.role !== 'system' && (
              <span className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {meta.label}
              </span>
            )}
            <p className="whitespace-pre-wrap">{msg.content}</p>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
