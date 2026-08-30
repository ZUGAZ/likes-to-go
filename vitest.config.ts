import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig({
	plugins: [solidPlugin()],
	test: {
		environment: 'happy-dom',
		globals: false,
		include: [
			'src/**/*.test.ts',
			'src/**/*.test.tsx',
			'cws-manifest-limits.test.ts',
			'verify-package-war.test.ts',
			'verify-package-size.test.ts',
		],
		setupFiles: ['vitest.setup.ts'],
	},
	resolve: {
		alias: [
			{
				// Only `@/…` — do not steal scoped packages like `@testing-library/*`
				find: /^@\//,
				replacement: `${resolve(__dirname, './src')}/`,
			},
		],
	},
});
