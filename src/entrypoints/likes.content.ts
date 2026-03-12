import { initContentScript } from '@/content/content-script';
import { defineContentScript } from 'wxt/utils/define-content-script';

export default defineContentScript({
	matches: ['*://soundcloud.com/you/likes*'],
	runAt: 'document_start',
	main: initContentScript,
});
