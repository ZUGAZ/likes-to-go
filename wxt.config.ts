import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'node:path';
import { defineConfig } from 'wxt';

export default defineConfig({
	srcDir: 'src',
	modules: ['@wxt-dev/module-solid', '@wxt-dev/auto-icons'],
	autoIcons: { baseIconPath: 'assets/icon.svg' },
	imports: false,
	manifest: {
		permissions: ['downloads', 'cookies'],
		host_permissions: [
			'https://*.soundcloud.com/*',
			'https://api-auth.soundcloud.com/*',
		],
	},
	// Don't auto-open a browser; load extension manually (e.g. Chrome on host when dev in container).
	webExt: { disabled: true },
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
