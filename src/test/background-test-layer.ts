import { CommandRunnerTag } from '@/background/command-runner';
import { ContentCommandsTag } from '@/background/content-commands';
import {
	DispatchLaneLive,
	DispatchLaneWorkerLive,
} from '@/background/dispatch-lane';
import {
	CollectionStateStorageNoop,
	CollectionStateStorageTag,
	type LoadCollectionStateFailed,
} from '@/background/infrastructure/collection-state-storage';
import {
	defaultMascotUiSurface,
	MascotUiSurfaceRefTag,
} from '@/background/mascot-ui-surface';
import {
	defaultOverlayHandoff,
	OverlayHandoffRefTag,
	PopupPresenceRefTag,
} from '@/background/overlay-handoff';
import type { BackgroundEnv } from '@/background/runtime/background-env';
import {
	CollectionStateHydratedTag,
	StateRefTag,
} from '@/background/state-ref';
import type { CollectionState } from '@/common/model/collection/state';
import { SendToTabFailed } from '@/common/model/collection/events/send-to-tab-failed';
import { initialCollectionState } from '@/common/model/collection/transition';
import { silentLoggerLayer } from '@/test/effect-log-test';
import { Duration, Effect, Layer, Ref, SubscriptionRef } from 'effect';

interface RecordedContentCommand {
	readonly command:
		| 'startPageCollection'
		| 'cancelPageCollection'
		| 'toggleMascot'
		| 'showMascot';
	readonly tabId: number;
}

export interface RecordingContentCommands {
	readonly layer: Layer.Layer<ContentCommandsTag>;
	readonly calls: () => ReadonlyArray<RecordedContentCommand>;
	readonly failWith: (error: SendToTabFailed | undefined) => void;
}

export function makeRecordingContentCommands(): RecordingContentCommands {
	const calls: Array<RecordedContentCommand> = [];
	let failure: SendToTabFailed | undefined;

	const run =
		(command: RecordedContentCommand['command']) =>
		(tabId: number): Effect.Effect<void, SendToTabFailed> =>
			Effect.gen(function* () {
				calls.push({ command, tabId });
				if (failure !== undefined) {
					return yield* Effect.fail(failure);
				}
			});

	const succeed =
		(command: RecordedContentCommand['command']) =>
		(tabId: number): Effect.Effect<void> =>
			run(command)(tabId).pipe(Effect.ignore);

	return {
		layer: Layer.succeed(ContentCommandsTag, {
			startPageCollection: run('startPageCollection'),
			cancelPageCollection: run('cancelPageCollection'),
			toggleMascot: succeed('toggleMascot'),
			showMascot: succeed('showMascot'),
		}),
		calls: () => [...calls],
		failWith: (error) => {
			failure = error;
		},
	};
}

export function makeInMemoryStorage(options?: {
	readonly stored?: CollectionState;
	readonly loadDelay?: Duration.DurationInput;
}): Layer.Layer<CollectionStateStorageTag> {
	const stored = options?.stored ?? null;
	const loadDelay = options?.loadDelay;
	return Layer.succeed(CollectionStateStorageTag, {
		load: () =>
			loadDelay === undefined
				? Effect.succeed(stored)
				: Effect.sleep(loadDelay).pipe(Effect.as(stored)),
		sync: () => Effect.void,
	});
}

export function makeFailingStorage(
	error: LoadCollectionStateFailed,
): Layer.Layer<CollectionStateStorageTag> {
	return Layer.succeed(CollectionStateStorageTag, {
		load: () => Effect.fail(error),
		sync: () => Effect.void,
	});
}

export function makeBackgroundTestLayer(options?: {
	readonly state?: CollectionState;
	readonly popupPresenceOpen?: boolean;
	readonly commandRunner?: Layer.Layer<CommandRunnerTag>;
	readonly contentCommands?: Layer.Layer<ContentCommandsTag>;
	readonly hydrationAwait?: Effect.Effect<void>;
	readonly logger?: Layer.Layer<never>;
}): Layer.Layer<BackgroundEnv> {
	const recording = makeRecordingContentCommands();
	const services = Layer.mergeAll(
		Layer.effect(
			StateRefTag,
			SubscriptionRef.make(options?.state ?? initialCollectionState),
		),
		Layer.succeed(CollectionStateHydratedTag, {
			await: options?.hydrationAwait ?? Effect.void,
		}),
		options?.commandRunner ??
			Layer.succeed(CommandRunnerTag, {
				run: () => Effect.void,
			}),
		CollectionStateStorageNoop,
		Layer.effect(MascotUiSurfaceRefTag, Ref.make(defaultMascotUiSurface())),
		Layer.effect(OverlayHandoffRefTag, Ref.make(defaultOverlayHandoff())),
		Layer.effect(
			PopupPresenceRefTag,
			Ref.make(options?.popupPresenceOpen ?? false),
		),
		DispatchLaneLive,
		options?.contentCommands ?? recording.layer,
	).pipe(Layer.provideMerge(options?.logger ?? silentLoggerLayer));

	return DispatchLaneWorkerLive.pipe(Layer.provideMerge(services));
}
