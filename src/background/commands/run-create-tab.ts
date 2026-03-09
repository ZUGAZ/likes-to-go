import { TabCreated, TabCreateFailed } from '@/common/model/collection';
import { Effect, flow, Option } from 'effect';
import { get } from 'effect/Struct';

export function runCreateTab(
	url: string,
): Effect.Effect<TabCreated, TabCreateFailed> {
	const createTabEffect = Effect.tryPromise({
		try: () =>
			chrome.tabs.create({
				url,
				active: false,
			}),
		catch: (err: unknown) =>
			TabCreateFailed({
				message: err instanceof Error ? err.message : String(err),
			}),
	});

	return createTabEffect.pipe(
		Effect.flatMap(
			flow(
				get('id'),
				Option.fromNullable,
				Option.match({
					onNone: () =>
						Effect.fail(
							TabCreateFailed({
								message: 'Failed to create tab',
							}),
						),
					onSome: (tabId) => Effect.succeed(TabCreated({ tabId })),
				}),
			),
		),
	);
}
