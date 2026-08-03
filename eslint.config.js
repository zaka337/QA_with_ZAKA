import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      jsxA11y.flatConfigs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // eslint-plugin-react-hooks v7 added these as experimental "React
      // Compiler readiness" checks. They flag long-standing, React-docs-
      // endorsed patterns used throughout this codebase — setting a loading
      // flag synchronously at the top of a data-fetching effect
      // (react.dev/learn/you-might-not-need-an-effect's own fetch example),
      // and one-time randomized values in a useMemo(() => ..., []) (e.g.
      // shadcn's sidebar skeleton width). Kept visible as warnings rather
      // than silenced outright, but not blocking CI on rewriting working,
      // safe code to appease a pre-1.0 lint rule.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
    },
  },
  {
    // shadcn/ui components colocate a component with its cva() variant
    // definitions in one file by convention — the standard shadcn shape,
    // not an oversight. Diverging from it would fight every future
    // `npx shadcn add` update for no real benefit.
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
