import * as React from 'react';

import { cn } from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  function Input({ className, type, ...props }, ref) {
    return (
      <input
        ref={ref}
        type={type}
        data-slot="input"
        className={cn(
          'flex min-h-[var(--touch-target-min)] w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-base text-foreground shadow-xs transition-[color,box-shadow] duration-[var(--duration-base)] ease-[var(--ease-default)] outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 md:h-9 md:min-h-0 md:py-1 md:text-sm',
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

export { Input };
