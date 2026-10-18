import type { Config } from 'tailwindcss';

/**
 * Tailwind mapea los tokens de `src/styles/tokens.css`.
 * Ningún componente escribe hex: los colores viven solo en las CSS vars.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--bg-rgb) / <alpha-value>)',
        panel: 'rgb(var(--panel-rgb) / <alpha-value>)',
        'panel-2': 'rgb(var(--panel-2-rgb) / <alpha-value>)',
        line: 'rgb(var(--line-rgb) / <alpha-value>)',
        'line-strong': 'rgb(var(--line-strong-rgb) / <alpha-value>)',
        text: 'rgb(var(--text-rgb) / <alpha-value>)',
        muted: 'rgb(var(--muted-rgb) / <alpha-value>)',
        accent: 'rgb(var(--accent-rgb) / <alpha-value>)',
        'accent-ink': 'rgb(var(--accent-ink-rgb) / <alpha-value>)',
        ok: 'rgb(var(--ok-rgb) / <alpha-value>)',
        warn: 'rgb(var(--warn-rgb) / <alpha-value>)',
        err: 'rgb(var(--err-rgb) / <alpha-value>)',
        hover: 'var(--hover-tint)',
        active: 'var(--active-tint)',
        control: 'rgb(var(--control-line-rgb) / <alpha-value>)',
        zebra: 'var(--zebra)',
        header: 'var(--header-bg)',
        overlay: 'var(--overlay)',
      },
      letterSpacing: {
        label: 'var(--tracking-label)',
      },
      fontFamily: {
        mono: 'var(--font-mono)',
        read: 'var(--font-read)',
      },
      fontSize: {
        label: 'var(--t-label)',
        meta: 'var(--t-meta)',
        ui: 'var(--t-ui)',
        body: 'var(--t-body)',
        read: 'var(--t-read)',
        h3: 'var(--t-h3)',
        h2: 'var(--t-h2)',
        display: 'var(--t-display)',
      },
      spacing: {
        '1pt': '8px',
      },
      borderRadius: {
        card: '10px',
        input: '6px',
        chip: '999px',
      },
      boxShadow: {
        overlay: 'var(--shadow-overlay)',
        soft: 'var(--shadow-soft)',
      },
      maxWidth: {
        shell: '1180px',
      },
      screens: {
        xs: '360px',
      },
      transitionDuration: {
        hover: '120ms',
        active: '80ms',
      },
    },
  },
  plugins: [],
} satisfies Config;
