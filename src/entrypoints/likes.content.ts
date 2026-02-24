import { defineContentScript } from 'wxt/utils/define-content-script';
import { initContentScript } from '@/content/content-script';

export default defineContentScript({
	matches: ['*://soundcloud.com/you/likes*'],
	runAt: 'document_start',
	main(ctx) {
		console.log(
			'[likes-to-go] content script loaded hot reload',
			ctx.options?.matches,
			'url:',
			window.location.href,
		);
		initContentScript(ctx);
	},
});
