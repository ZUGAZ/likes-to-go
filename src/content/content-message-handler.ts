import { parseRequestMessage } from '@/common/infrastructure/parse-request-message';
import { sendToBackgroundEffect } from '@/common/infrastructure/send-to-background';
import {
	CollectionErrorRequest,
	LoginRequiredRequest,
	isCancelCollection,
	isStartCollection,
	isToggleMascot,
} from '@/common/model/request-message';
import { makeCollectionLive } from '@/content/infrastructure/collection-services';
import {
	collectionPipeline,
	type CollectionOutcome,
	OutcomeError,
} from '@/content/model/collection-pipeline';
import {
	CollectionPageLoginRequired,
	UnsupportedCollectionPage,
	detectSupportedCollectionPage,
} from '@/content/model/page-detection';
import type { ContentEnv } from '@/content/runtime/content-env';
import { Cause, Effect, Either, Exit, Fiber, Runtime } from 'effect';
import type { ContentScriptContext } from 'wxt/utils/content-script-context';

export type ContentScriptCtx = Pick<
	ContentScriptContext,
	'isValid' | 'onInvalidated'
>;

export interface ContentMessageHandlerDeps {
	readonly onToggleMascot: () => void;
	readonly isMascotVisible: () => boolean;
}

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

function reportDetectionFailure(
	request: DetectionFailureRequest,
): Effect.Effect<CollectionOutcome> {
	return Effect.log('content page detection failed', request.reason).pipe(
		Effect.zipRight(sendToBackgroundEffect(request)),
		Effect.as(OutcomeError({ message: request.message })),
		Effect.catchAll(() =>
			Effect.succeed(OutcomeError({ message: request.message })),
		),
	);
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

export function createContentMessageHandler(
	runtime: Runtime.Runtime<ContentEnv>,
	ctx: ContentScriptCtx,
	deps: ContentMessageHandlerDeps,
): (
	message: unknown,
	_sender: chrome.runtime.MessageSender,
	sendResponse: (response?: unknown) => void,
) => boolean {
	let fiber: Fiber.RuntimeFiber<CollectionOutcome> | null = null;

	const interuptFiber = () => {
		if (fiber !== null) {
			Runtime.runFork(runtime)(Fiber.interrupt(fiber));
			fiber = null;
		}
	};

	ctx.onInvalidated(interuptFiber);

	return (
		message: unknown,
		_sender: chrome.runtime.MessageSender,
		sendResponse: (response?: unknown) => void,
	) => {
		return Either.match(parseRequestMessage(message), {
			onLeft: () => false,
			onRight: (msg) => {
				if (isStartCollection(msg)) {
					void Runtime.runPromise(runtime)(
						Effect.log('StartCollection tab message received'),
					);
					interuptFiber();

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
								onFailure: (error) =>
									reportDetectionFailure(pageDetectionErrorToRequest(error)),
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
					);

					fiber = Runtime.runFork(runtime)(program);

					void Runtime.runPromise(runtime)(
						Fiber.await(fiber).pipe(
							Effect.tap((exit) => {
								fiber = null;
								if (Exit.isInterrupted(exit)) {
									return Effect.log('content collection interrupted');
								}
								return Exit.match(exit, {
									onFailure: (cause) =>
										Effect.logWarning(
											'content collection fiber died',
											Cause.pretty(cause),
										),
									onSuccess: (outcome) =>
										Effect.log('content collection finished', {
											outcome: outcome._tag,
											...(outcome._tag === 'Error'
												? { message: outcome.message }
												: {}),
										}),
								});
							}),
						),
					);

					// Acknowledge immediately so background SendStartToTab can finish
					// before the pipeline sends TracksBatch (avoids message deadlock).
					sendResponse();
					void Runtime.runPromise(runtime)(
						Effect.log(
							'StartCollection tab message ack sent, pipeline fiber forked',
						),
					);
					return false;
				}

				if (isCancelCollection(msg)) {
					void Runtime.runPromise(runtime)(
						Effect.log('content CancelCollection received'),
					);
					interuptFiber();
					sendResponse();
					return false;
				}

				if (isToggleMascot(msg)) {
					void Runtime.runPromise(runtime)(
						Effect.gen(function* () {
							yield* Effect.log('ToggleMascot received');
							deps.onToggleMascot();
							yield* Effect.log('overlay visibility toggled', {
								visible: deps.isMascotVisible(),
							});
						}),
					);
					sendResponse();
					return false;
				}

				return false;
			},
		});
	};
}
