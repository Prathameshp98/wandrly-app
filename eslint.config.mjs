import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

/**
 * Money is a decimal string in the currency's minor units (API_CONTRACT §3.2).
 * `Number()` loses precision above 2^53 and `/100` is wrong for JPY (0 decimals)
 * and BHD (3). Every conversion belongs in src/lib/money.ts and nowhere else.
 * FR-SPLIT-16 forbids floating-point money arithmetic anywhere, client included.
 */
const moneyRules = [
  {
    selector:
      'CallExpression[callee.name=/^(Number|parseFloat|parseInt)$/] > :matches(Identifier, MemberExpression)[name=/[Mm]inor$/], CallExpression[callee.name=/^(Number|parseFloat|parseInt)$/] > MemberExpression[property.name=/[Mm]inor$/]',
    message:
      'Never coerce a minor-unit amount to Number — it loses precision. Use parseMinor()/formatMoney() from @/lib/money.',
  },
  {
    selector:
      "BinaryExpression[operator='/'][right.value=100] > MemberExpression[property.name=/[Mm]inor$/]",
    message:
      'Never divide a minor-unit amount by 100 — JPY has no minor unit and BHD has three. Use formatMoney() from @/lib/money.',
  },
];

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      'no-restricted-syntax': ['error', ...moneyRules],

      // FR-NFR-A11Y-03: every interactive element is a real focusable control.
      // The prototype uses <div onClick> for sidebar nav and folder rows; we do not.
      'jsx-a11y/click-events-have-key-events': 'error',
      'jsx-a11y/no-static-element-interactions': 'error',
      'jsx-a11y/no-noninteractive-element-interactions': 'error',
      'jsx-a11y/anchor-is-valid': 'error',

      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // Generated from openapi.json — never hand-edited, so never linted.
    files: ['src/lib/api/schema.d.ts'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
  {
    // Developer CLI tools. stdout is their entire interface.
    files: ['scripts/**/*.{js,mjs,ts}'],
    rules: { 'no-console': 'off' },
  },
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'next-env.d.ts',
      'src/lib/api/schema.d.ts',
    ],
  },
];

export default eslintConfig;
