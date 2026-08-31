import { CommandRunnerTag } from '@/background/command-runner';
import { CollectionStateStorageTag } from '@/background/infrastructure/collection-state-storage';
import {
	isExtensionPopupSender,
	rememberMascotUiSurfaceFromSender,
	shouldClaimMascotNotifySurface,
} from '@/background/mascot-ui-surface';
import {
	maybeRevealOverlayEffect,
	PopupPortCountRefTag,
	rememberOverlayHandoffFromSender,
	resetOverlayHandoffEffect,
} from '@/background/overlay-handoff';
import type { BackgroundEnv } from '@/background/runtime/background-env';
import { StateRefTag } from '@/background/state-ref';
import type { CollectionCommand } from '@/common/model/collection/command';
import type { CollectionEvent } from '@/common/model/collection/event';
import { requestMessageToCollectionEvent } from '@/common/model/collection/request-message-to-event';
import { hasTracks } from '@/common/model/collection/state';
import {
	collectionStateToDownloadExportResponse,
	collectionStateToGetStateResponse,
} from '@/common/model/collection/state-to-response';
import { isErrorState } from '@/common/model/collection/states/error-state';
import { transition } from '@/common/model/collection/transition';
import { resolveExportFormatId } from '@/common/model/export-format/export-format-id';
import {
	isCancelCollection,
	isDownloadExport,
	isStartCollection,
	isToggleMascot,
	isShowMascot,
	type GetStateResponse,
	type RequestMessage,
} from '@/common/model/request-message';
import { Effect, Ref } from 'effect';

function claimsMascotNotifySurface(message: RequestMessage): boolean {
	return (
		isStartCollection(message) ||
		isCancelCollection(message) ||
		isDownloadExport(message)
	);
}

function runCommandEffect(
	cmd: CollectionCommand,
): Effect.Effect<void, never, BackgroundEnv> {
	return Effect.gen(function* () {
		const runner = yield* CommandRunnerTag;
		yield* runner.run(cmd);
	});
}

export function dispatchEffect(
	event: CollectionEvent,
): Effect.Effect<void, never, BackgroundEnv> {
	return Effect.gen(function* () {
		const ref = yield* StateRefTag;
		const current = yield* Ref.get(ref);
		const result = transition(current, event);
		yield* Ref.set(ref, result.state);
		const storage = yield* CollectionStateStorageTag;
		yield* storage
			.sync(result.state)
			.pipe(
				Effect.catchAll((error) =>
					Effect.logWarning(
						'collection state storage sync failed',
						error.reason,
					),
				),
			);
		const stateTag = result.state._tag;
		const message = isErrorState(result.state)
			? result.state.message
			: 'No message';
		const tracksLen = hasTracks(result.state)
			? result.state.tracks.length
			: undefined;

		yield* Effect.log(
			'Event:',
			event._tag,
			'→ state',
			stateTag,
			message,
			tracksLen !== undefined ? { tracks: tracksLen } : '',
			'commands',
			result.commands.map((cmd) => cmd._tag).join(', '),
		);

		yield* Effect.forEach(result.commands, runCommandEffect);
		yield* maybeRevealOverlayEffect();
	}).pipe(Effect.withLogSpan('Dispatch'));
}

export function handleMessageEffect(
	message: RequestMessage,
	sender: chrome.runtime.MessageSender,
): Effect.Effect<GetStateResponse, never, BackgroundEnv> {
	return Effect.gen(function* () {
		yield* Effect.log('incoming message', message._tag, {
			senderTabId: sender.tab?.id,
			senderFrameId: sender.frameId,
		});

		if (isToggleMascot(message) || isShowMascot(message)) {
			yield* Effect.logWarning(
				`${message._tag} received by background; this is a content-only message`,
			);
			const ref = yield* StateRefTag;
			const state = yield* Ref.get(ref);
			return collectionStateToGetStateResponse(state);
		}

		if (isCancelCollection(message)) {
			yield* resetOverlayHandoffEffect();
		}

		if (isStartCollection(message)) {
			yield* rememberOverlayHandoffFromSender(sender);
		}

		const popupPortCountRef = yield* PopupPortCountRefTag;
		const popupConnected = (yield* Ref.get(popupPortCountRef)) > 0;
		if (
			shouldClaimMascotNotifySurface({
				claimsFromMessage: claimsMascotNotifySurface(message),
				popupConnected,
				senderIsExtensionPopup: isExtensionPopupSender(sender),
			})
		) {
			yield* rememberMascotUiSurfaceFromSender(sender);
		}

		const event = requestMessageToCollectionEvent(message);
		yield* dispatchEffect(event);

		const ref = yield* StateRefTag;
		const state = yield* Ref.get(ref);
		const response = isDownloadExport(message)
			? collectionStateToDownloadExportResponse(
					state,
					resolveExportFormatId(message),
				)
			: collectionStateToGetStateResponse(state);
		yield* Effect.log('handleMessage responding', message._tag, {
			status: response.status,
			trackCount: response.trackCount,
			stateTag: state._tag,
		});
		return response;
	}).pipe(Effect.withLogSpan('handleMessage'));
}
