import { ContentCommandsTag } from '@/background/content-commands';
import { SendToTabFailed } from '@/common/model/collection/events/send-to-tab-failed';
import { Effect } from 'effect';

export function runSendCancelToTab(
	tabId: number,
): Effect.Effect<void, SendToTabFailed, ContentCommandsTag> {
	return Effect.gen(function* () {
		yield* Effect.log('background SendCancelToTab', tabId);
		yield* (yield* ContentCommandsTag).cancelPageCollection(tabId);
	}).pipe(Effect.withLogSpan('runSendCancelToTab'));
}
