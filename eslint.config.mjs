import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Agent worktree artifacts:
    '.claude/**',
    '.worktrees/**',
    // Generated submission packaging:
    'submission/**',
    // Third-party skill scripts (CommonJS, not app code):
    'superpowers/**',
    '.kiro/**',
  ]),
  {
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'sonner',
              importNames: ['toast'],
              message: "Use `notify` from '@/lib/toast' instead.",
            },
          ],
        },
      ],
    },
  },
])

export default eslintConfig
