import { BackgroundSenderTag } from '@/content/infrastructure/background-sender';
import type { BackgroundSender } from '@/content/infrastructure/background-sender';
import { makeCollectionLive } from '@/content/infrastructure/collection-services';
import { MascotControlsTag } from '@/content/mascot-controls';
import {
	collectionPipeline,
	OutcomeError,
	type CollectionOutcome,
} from '@/content/model/collection-pipeline';
import {
	CollectionPageLoginRequired,
	UnsupportedCollectionPage,
	detectSupportedCollectionPage,
} from '@/content/model/page-detection';
import {
	CollectionErrorRequest,
	LoginRequiredRequest,
} from '@/common/model/request-message';
import {
	Cause,
	Context,
	Effect,
	Exit,
	Fiber,
	Layer,
	Option,
	Ref,
} from 'effect';

type DetectionFailureRequest =
	| ReturnType<typeof CollectionErrorRequest>
	| ReturnType<typeof LoginRequiredRequest>;

function pageDetectionErrorToRequest(
	error: UnsupportedCollectionPage | CollectionPageLoginRequired,
): DetectionFailureRequest {
	if (error instanceof CollectionPageLoginRequired) {
		return LoginRequiredRequest({
			message: error.message,
			reason: error.reason,
		});
	}

	return CollectionErrorRequest({
		message: error.message,
		reason: error.reason,
	});
}

function collectionFailureMessage(cause: unknown): string {
	if (
		typeof cause === 'object' &&
		cause !== null &&
		'message' in cause &&
		typeof cause.message === 'string'
	) {
		return cause.message;
	}

	return 'Collection failed unexpectedly';
}

function pageDetectionFailureReason(error: unknown): string {
	if (error instanceof UnsupportedCollectionPage) {
		return error.reason;
	}

	if (error instanceof CollectionPageLoginRequired) {
		return error.reason;
	}

	return 'unknown';
}

function reportDetectionFailure(
	sender: BackgroundSender,
	error: UnsupportedCollectionPage | CollectionPageLoginRequired,
): Effect.Effect<CollectionOutcome> {
	const request = pageDetectionErrorToRequest(error);
	const send =
		error instanceof CollectionPageLoginRequired
			? sender.sendLoginRequired(request.message, request.reason)
			: sender.sendError(request.message, request.reason);

	return Effect.log('content page detection failed', request.reason).pipe(
		Effect.zipRight(send),
		Effect.as(OutcomeError({ message: request.message })),
		Effect.catchAll(() =>
			Effect.succeed(OutcomeError({ message: request.message })),
		),
	);
}

function logCollectionExit(
	exit: Exit.Exit<CollectionOutcome>,
): Effect.Effect<void> {
	if (Exit.isInterrupted(exit)) {
		return Effect.log('content collection interrupted');
	}

	return Exit.match(exit, {
		onFailure: (cause) =>
			Effect.logWarning('content collection fiber died', Cause.pretty(cause)),
		onSuccess: (outcome) => {
			const message = 'message' in outcome ? outcome.message : undefined;
			return Effect.log('content collection finished', {
				outcome: outcome._tag,
				...(message === undefined ? {} : { message }),
			});
		},
	});
}

export class PageCollectionTag extends Context.Tag('PageCollection')<
	PageCollectionTag,
	{
		readonly start: Effect.Effect<void>;
		readonly cancel: Effect.Effect<void>;
	}
>() {}

export const PageCollectionLive: Layer.Layer<
	PageCollectionTag,
	never,
	BackgroundSenderTag | MascotControlsTag
> = Layer.scoped(
	PageCollectionTag,
	Effect.gen(function* () {
		const pageScope = yield* Effect.scope;
		const sender = yield* BackgroundSenderTag;
		yield* MascotControlsTag;
		const fiberRef = yield* Ref.make<
			Option.Option<Fiber.RuntimeFiber<CollectionOutcome>>
		>(Option.none());

		const releaseFiber = (fiber: Fiber.RuntimeFiber<CollectionOutcome>) =>
			Ref.update(fiberRef, (current) =>
				Option.match(current, {
					onNone: () => Option.none(),
					onSome: (stored) => (stored === fiber ? Option.none() : current),
				}),
			);

		const interruptPrevious = Effect.gen(function* () {
			const current = yield* Ref.getAndSet(fiberRef, Option.none());
			if (Option.isSome(current)) {
				yield* Fiber.interrupt(current.value);
			}
		});

		const program = Effect.gen(function* () {
			yield* Effect.log('StartCollection pipeline program begin');

			return yield* detectSupportedCollectionPage({
				pageDocument: document,
			}).pipe(
				Effect.tapError((error) =>
					Effect.logWarning('StartCollection page detection failed', {
						reason: pageDetectionFailureReason(error),
					}),
				),
				Effect.matchEffect({
					onFailure: (error) => reportDetectionFailure(sender, error),
					onSuccess: ({ root, layoutContext }) =>
						Effect.log(
							'StartCollection page detected, running collection pipeline',
						).pipe(
							Effect.zipRight(
								collectionPipeline.pipe(
									Effect.provide(makeCollectionLive(root, layoutContext)),
								),
							),
						),
				}),
			);
		}).pipe(
			Effect.tapError((cause) =>
				Effect.logError('content StartCollection program failed', cause),
			),
			Effect.catchAll((cause) =>
				Effect.succeed(
					OutcomeError({
						message: collectionFailureMessage(cause),
					}),
				),
			),
			Effect.catchAllDefect((defect) =>
				Effect.gen(function* () {
					yield* Effect.logError(
						'content StartCollection program defect',
						defect,
					);
					return OutcomeError({
						message: collectionFailureMessage(defect),
					});
				}),
			),
			Effect.withLogSpan('StartCollection'),
			Effect.provideService(BackgroundSenderTag, sender),
		);

		const start = Effect.gen(function* () {
			yield* interruptPrevious;
			const fiber = yield* Effect.forkIn(program, pageScope);
			yield* Ref.set(fiberRef, Option.some(fiber));
			yield* Fiber.await(fiber).pipe(
				Effect.flatMap((exit) =>
					releaseFiber(fiber).pipe(Effect.zipRight(logCollectionExit(exit))),
				),
				Effect.forkIn(pageScope),
			);
		});

		return {
			start,
			cancel: interruptPrevious,
		};
	}),
);
