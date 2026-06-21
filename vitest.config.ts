import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: [
      { find: '@html-native/shared/diagnostics.js', replacement: resolve(__dirname, 'packages/shared/diagnostics.ts') },
      { find: '@html-native/semantic-analyzer/ai', replacement: resolve(__dirname, 'packages/semantic-analyzer/ai.ts') },
      { find: '@html-native/shared', replacement: resolve(__dirname, 'packages/shared/index.ts') },
      { find: '@html-native/parser', replacement: resolve(__dirname, 'packages/parser/index.ts') },
      { find: '@html-native/css-analyzer', replacement: resolve(__dirname, 'packages/css-analyzer/index.ts') },
      { find: '@html-native/semantic-analyzer', replacement: resolve(__dirname, 'packages/semantic-analyzer/index.ts') },
      { find: '@html-native/ir', replacement: resolve(__dirname, 'packages/ir/index.ts') },
      { find: '@html-native/optimizer', replacement: resolve(__dirname, 'packages/optimizer/index.ts') },
      { find: '@html-native/generator-flutter', replacement: resolve(__dirname, 'packages/generators/flutter/index.ts') },
      { find: '@html-native/generator-compose', replacement: resolve(__dirname, 'packages/generators/compose/index.ts') },
      { find: '@html-native/generator-core', replacement: resolve(__dirname, 'packages/generator-core/index.ts') },
      { find: '@html-native/generator-swiftui', replacement: resolve(__dirname, 'packages/generators/swiftui/index.ts') },
      { find: '@html-native/cli', replacement: resolve(__dirname, 'packages/cli/index.ts') },
    ],
  },
  test: {
    globals: true,
    include: ['packages/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['packages/**'],
      exclude: ['**/*.test.ts', '**/node_modules/**'],
    },
  },
});
