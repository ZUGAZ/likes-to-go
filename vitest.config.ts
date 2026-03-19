import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig({
	plugins: [solidPlugin()],
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
