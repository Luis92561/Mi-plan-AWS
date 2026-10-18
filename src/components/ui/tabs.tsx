import * as TabsPrimitive from '@radix-ui/react-tabs';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export const TabsRoot = TabsPrimitive.Root;

export function TabsList({ children, ariaLabel, className }: { children: ReactNode; ariaLabel: string; className?: string }) {
  return (
    <TabsPrimitive.List
      aria-label={ariaLabel}
      className={cn(
        'flex gap-1 overflow-x-auto border-b border-line pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
    >
      {children}
    </TabsPrimitive.List>
  );
}

export function TabsTrigger({ value, children }: { value: string; children: ReactNode }) {
  return (
    <TabsPrimitive.Trigger
      value={value}
      className={cn(
        'shrink-0 whitespace-nowrap border-b-2 border-transparent px-2.5 py-2 text-ui text-muted outline-none',
        'transition-colors duration-hover hover:text-text',
        'data-[state=active]:border-accent data-[state=active]:text-text data-[state=active]:font-medium',
      )}
    >
      {children}
    </TabsPrimitive.Trigger>
  );
}

export function TabsContent({ value, children, className }: { value: string; children: ReactNode; className?: string }) {
  return (
    <TabsPrimitive.Content value={value} className={cn('pt-4 outline-none', className)}>
      {children}
    </TabsPrimitive.Content>
  );
}
