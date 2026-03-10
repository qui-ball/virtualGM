import { useEffect } from 'react';
import { ChatMessageList, ChatInput, DiceRollPrompt } from '@/components/chat';
import { useChat } from '@/hooks/useChat';

export function ChatPage() {
  const {
    messages,
    loading,
    pendingAction,
    sessionReady,
    startSession,
    sendMessage,
    respondToAction,
    autoRoll,
  } = useChat();

  useEffect(() => {
    startSession();
  }, [startSession]);

  if (!sessionReady) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">Starting session...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ChatMessageList messages={messages} />

      {loading && (
        <div className="px-4 py-2 text-sm text-muted-foreground">
          GM is thinking...
        </div>
      )}

      {pendingAction ? (
        <DiceRollPrompt
          action={pendingAction}
          onAutoRoll={autoRoll}
          onManualRoll={(result) => respondToAction(result)}
          disabled={loading}
        />
      ) : (
        <ChatInput onSend={sendMessage} disabled={loading} />
      )}
    </div>
  );
}
