import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * ESLint (flat config, ESLint 9) — «Mi Plan AWS».
 * Reglas del Contrato de desarrollo §1: sin `console.log`, sin `any`,
 * sin `@ts-ignore` y sin colores literales en componentes.
 *
 * El color literal solo se permite fuera de los componentes: `src/styles/tokens.css`
 * y los valores de infraestructura (`meta[name=theme-color]`, manifiesto PWA).
 */
export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'public/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      '.tmp/**',
      '.npm-cache/**',
      'android/**',
      'deliverables/**',
      '*.tmp.*',
      'tmp-*',
      '.dsh-*',
      'eslint.*.check.mjs',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,mjs,js}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true }, sourceType: 'module' },
    },
    rules: {
      'no-console': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }],
      'no-restricted-syntax': [
        'error',
        { selector: 'TSIgnore', message: 'Prohibido @ts-ignore (contrato §1.5).' },
      ],
    },
  },
  {
    files: ['src/features/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        { selector: 'TSIgnore', message: 'Prohibido @ts-ignore (contrato §1.5).' },
        {
          selector: 'Literal[value=/^#[0-9a-fA-F]{3,8}$/]',
          message: 'Prohibido escribir colores en componentes (contrato §1.1).',
        },
      ],
    },
  },
  {
    // Los scripts de consola (servidor local, certificado) sí hablan por stdout.
    files: ['scripts/**/*.mjs'],
    rules: {
      'no-console': 'off',
    },
  },
);
