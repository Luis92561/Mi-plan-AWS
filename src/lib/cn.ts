import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * `tailwind-merge` necesita conocer los tokens del proyecto para no confundir
 * una talla de texto (`text-meta`) con un color (`text-muted`). Sin esto, al
 * combinar `text-accent-ink` con `text-ui` una de las dos clases desaparecía y
 * el texto acababa con el color heredado.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: ['label', 'meta', 'ui', 'body', 'read', 'h3', 'h2', 'display'],
        },
      ],
      'text-color': [
        {
          text: [
            'bg',
            'panel',
            'panel-2',
            'line',
            'line-strong',
            'text',
            'muted',
            'accent',
            'accent-ink',
            'ok',
            'warn',
            'err',
            'control',
            'hover',
            'active',
            'overlay',
          ],
        },
      ],
      rounded: [{ rounded: ['card', 'input', 'chip'] }],
      shadow: [{ shadow: ['overlay', 'soft'] }],
      'max-w': [{ 'max-w': ['shell'] }],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
