import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	srcDir: 'src',
	modules: ['@wxt-dev/module-solid'],
	imports: false,
	vite: () => ({
		plugins: [tailwindcss()],
	}),
});
