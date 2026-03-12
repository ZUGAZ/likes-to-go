import { Effect } from 'effect';
import {
	createContentMessageHandler,
	type ContentScriptCtx,
} from '@/content/content-message-handler';
import { makeContentRuntime } from '@/content/runtime/content-runtime';

export function initContentScript(ctx: ContentScriptCtx): void {
	const program = Effect.scoped(
		Effect.gen(function* () {
			const runtime = yield* makeContentRuntime();
			const handler = createContentMessageHandler(runtime, ctx);

			chrome.runtime.onMessage.addListener(handler);

			yield* Effect.never;
		}),
	);

	void Effect.runPromise(program);
}
