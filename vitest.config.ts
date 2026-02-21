import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
	test: {
		environment: 'happy-dom',
		globals: false,
		include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
	},
	resolve: {
		alias: {
			'@': resolve(__dirname, './src'),
		},
	},
});
