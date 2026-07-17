import type { StorybookConfig } from 'storybook-solidjs-vite';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'node:path';
import { mergeConfig } from 'vite';

const config = {
	stories: ['../src/**/*.stories.@(ts|tsx)'],
	addons: ['@storybook/addon-docs'],
	framework: {
		name: 'storybook-solidjs-vite',
		options: {},
	},
	async viteFinal(config) {
		return mergeConfig(config, {
			plugins: [tailwindcss()],
			resolve: {
				alias: {
					'@': resolve(import.meta.dirname, '../src'),
				},
			},
			server: {
				host: '0.0.0.0',
			},
		});
	},
} satisfies StorybookConfig;

export default config;
