import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

export function Checkbox({
  checked,
  onCheckedChange,
  label,
  className,
  disabled,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <CheckboxPrimitive.Root
      checked={checked}
      disabled={disabled}
      onCheckedChange={(value) => onCheckedChange(value === true)}
      aria-label={label}
      className={cn(
        'grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[4px] border border-control bg-panel-2',
        'transition-colors duration-hover hover:border-accent',
        'data-[state=checked]:border-accent data-[state=checked]:bg-accent data-[state=checked]:text-accent-ink',
        disabled && 'opacity-45',
        className,
      )}
    >
      <CheckboxPrimitive.Indicator>
        <Check size={12} strokeWidth={3} aria-hidden="true" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export function Switch({
  checked,
  onCheckedChange,
  label,
  className,
  disabled,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <SwitchPrimitive.Root
      checked={checked}
      disabled={disabled}
      onCheckedChange={onCheckedChange}
      aria-label={label}
      className={cn(
        'relative h-[22px] w-[38px] shrink-0 rounded-chip border border-control bg-panel-2 transition-colors duration-hover',
        'data-[state=checked]:border-accent data-[state=checked]:bg-accent',
        disabled && 'opacity-45',
        className,
      )}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          'block h-4 w-4 translate-x-[2px] rounded-chip bg-muted transition-transform duration-hover',
          'data-[state=checked]:translate-x-[18px] data-[state=checked]:bg-accent-ink',
        )}
      />
    </SwitchPrimitive.Root>
  );
}
