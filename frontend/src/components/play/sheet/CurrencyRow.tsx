import type { CoinDisplay } from '@/lib/play/currency';
import { cn } from '@/lib/utils';

type CurrencyRowProps = {
  coins: CoinDisplay[];
  className?: string;
};

export function CurrencyRow({ coins, className }: CurrencyRowProps) {
  return (
    <div className={cn('play-currency-row', className)} aria-label="Currency">
      {coins.map((coin) => (
        <div
          key={coin.key}
          className={cn('play-currency-cell', `play-currency-${coin.key}`)}
        >
          <span className="play-currency-abbr">{coin.abbr}</span>
          <span className="play-currency-amount">{coin.amount}</span>
          <span className="play-currency-label">{coin.label}</span>
        </div>
      ))}
    </div>
  );
}
