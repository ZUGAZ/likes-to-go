import {
	createContentMessageHandler,
	type ContentScriptCtx,
} from '@/content/content-message-handler';

export function initContentScript(ctx: ContentScriptCtx): void {
	console.log('[likes-to-go] initContentScript');
	chrome.runtime.onMessage.addListener(createContentMessageHandler(ctx));
}
