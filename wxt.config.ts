import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'node:path';

export default defineConfig({
	srcDir: 'src',
	modules: ['@wxt-dev/module-solid', '@wxt-dev/auto-icons'],
	autoIcons: { baseIconPath: 'assets/icon.svg' },
	imports: false,
	vite: () => ({
		plugins: [tailwindcss()],
		resolve: {
			alias: {
				'@': resolve(__dirname, 'src'),
			},
			extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
		},
	}),
});
