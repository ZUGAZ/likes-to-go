import { catchError } from '@/common/model/catch-error';
import { TabCreateFailed } from '@/common/model/collection/events/tab-create-failed';
import { TabCreated } from '@/common/model/collection/events/tab-created';
import { Effect, flow, Option } from 'effect';
import { get } from 'effect/Struct';

export function runCreateTab(
	url: string,
): Effect.Effect<TabCreated, TabCreateFailed> {
	const createTabEffect = Effect.tryPromise({
		try: () =>
			chrome.tabs.create({
				url,
				active: true,
			}),
		catch: catchError(TabCreateFailed, 'Could not open the likes page'),
	});

	return Effect.gen(function* () {
		yield* Effect.log('background CreateTab', url);

		return yield* createTabEffect.pipe(
			Effect.flatMap(
				flow(
					get('id'),
					Option.fromNullable,
					Option.match({
						onNone: () =>
							Effect.fail(
								TabCreateFailed({
									message: 'Could not open the likes page',
									reason: 'Tab created without an id',
								}),
							),
						onSome: (tabId) => Effect.succeed(TabCreated({ tabId })),
					}),
				),
			),
		);
	}).pipe(Effect.withLogSpan('runCreateTab'));
}
