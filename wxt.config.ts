import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'node:path';
import { defineConfig } from 'wxt';

/** Mascot PNGs exposed to content scripts on SoundCloud via chrome.runtime.getURL. */
export const mascotWebAccessibleResources = [
	{
		resources: ['mascot/*.png'],
		matches: ['https://*.soundcloud.com/*'],
	},
];

export default defineConfig({
	srcDir: 'src',
	modules: ['@wxt-dev/module-solid', '@wxt-dev/auto-icons'],
	autoIcons: { baseIconPath: 'assets/icon.svg' },
	imports: false,
	manifest: {
		permissions: ['downloads', 'cookies', 'tabs', 'storage'],
		host_permissions: ['https://*.soundcloud.com/*'],
		web_accessible_resources: [...mascotWebAccessibleResources],
	},
	// Don't auto-open a browser; load extension manually (e.g. Chrome on host when dev in container).
	webExt: { disabled: true },
	dev: {
		server: {
			host: '0.0.0.0',
			port: 3000,
		},
	},
	vite: () => ({
		server: {
			strictPort: true,
		},
		plugins: [tailwindcss()],
		resolve: {
			alias: [
				{
					// Only `@/…` — do not steal scoped packages like `@testing-library/*`
					find: /^@\//,
					replacement: `${resolve(__dirname, 'src')}/`,
				},
			],
			extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
		},

	}),
});
