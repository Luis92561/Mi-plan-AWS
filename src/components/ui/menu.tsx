import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export const Menu = DropdownPrimitive.Root;
export const MenuTrigger = DropdownPrimitive.Trigger;

export function MenuContent({
  children,
  align = 'end',
  className,
  ariaLabel,
}: {
  children: ReactNode;
  align?: 'start' | 'end';
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.Content
        align={align}
        sideOffset={6}
        aria-label={ariaLabel}
        className={cn(
          'z-[70] min-w-[190px] rounded-card border border-line bg-panel p-1 shadow-overlay',
          className,
        )}
      >
        {children}
      </DropdownPrimitive.Content>
    </DropdownPrimitive.Portal>
  );
}

export function MenuItem({
  children,
  onSelect,
  danger = false,
  disabled = false,
  className,
}: {
  children: ReactNode;
  onSelect?: () => void;
  danger?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <DropdownPrimitive.Item
      disabled={disabled}
      onSelect={() => {
        // Sin `preventDefault`: Radix cierra el menú al elegir un ítem.
        onSelect?.();
      }}
      className={cn(
        'cursor-pointer select-none rounded-input px-2.5 py-1.5 text-ui outline-none',
        'data-[highlighted]:bg-hover data-[disabled]:opacity-45',
        danger ? 'text-err' : 'text-text',
        className,
      )}
    >
      {children}
    </DropdownPrimitive.Item>
  );
}

export function MenuSeparator() {
  return <DropdownPrimitive.Separator className="my-1 h-px bg-line" />;
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return (
    <DropdownPrimitive.Label className="label-mono px-2.5 py-1.5">{children}</DropdownPrimitive.Label>
  );
}
