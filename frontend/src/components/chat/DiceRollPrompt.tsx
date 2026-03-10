import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { PendingAction } from '@/types';

type DiceRollPromptProps = {
  action: PendingAction;
  onAutoRoll: () => void;
  onManualRoll: (result: number) => void;
  disabled?: boolean;
};

export function DiceRollPrompt({
  action,
  onAutoRoll,
  onManualRoll,
  disabled = false,
}: DiceRollPromptProps) {
  const [manualValue, setManualValue] = useState('');

  const handleManual = () => {
    const num = parseInt(manualValue, 10);
    if (!Number.isNaN(num) && num >= 1) {
      onManualRoll(num);
      setManualValue('');
    }
  };

  return (
    <div className="flex flex-col gap-2 border-t border-border bg-muted/50 px-4 py-3">
      <p className="text-sm font-medium text-foreground">
        Roll {action.dice_count}
        {action.dice_type} for{' '}
        <span className="font-semibold">{action.purpose}</span>
      </p>

      <div className="flex items-center gap-2">
        <Button onClick={onAutoRoll} disabled={disabled} size="sm">
          Roll
        </Button>

        <span className="text-xs text-muted-foreground">or enter manually:</span>

        <input
          type="number"
          min={1}
          value={manualValue}
          onChange={(e) => setManualValue(e.target.value)}
          disabled={disabled}
          className="w-20 rounded-md border border-input bg-background px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleManual();
          }}
        />
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || !manualValue}
          onClick={handleManual}
        >
          Submit
        </Button>
      </div>
    </div>
  );
}
