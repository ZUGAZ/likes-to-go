import { dispatchEffect } from '@/background/background-dispatch';
import {
	isPopupLikeCaller,
	rememberMascotUiSurfaceFromCaller,
	shouldClaimMascotNotifySurface,
} from '@/background/mascot-ui-surface';
import {
	isPopupOpenEffect,
	rememberOverlayHandoffFromCaller,
	resetOverlayHandoffEffect,
} from '@/background/overlay-handoff';
import type { BackgroundEnv } from '@/background/runtime/background-env';
import { StateRefTag } from '@/background/state-ref';
import type { CollectionEvent } from '@/common/model/collection/event';
import { CancelCollection } from '@/common/model/collection/events/cancel-collection';
import { DownloadExport } from '@/common/model/collection/events/download-export-event';
import { StartCollection } from '@/common/model/collection/events/start-collection';
import { collectionStateToStatus } from '@/common/model/collection/state-to-status';
import { isSaving } from '@/common/model/collection/states/saving';
import type { ExportFormatId } from '@/common/model/export-format/export-format-id';
import { renderExportBody } from '@/common/model/export-format/render-export-body';
import { ExportUnavailable } from '@/common/model/messaging/background-rpcs';
import type { Endpoint } from 'browser-extension-kit/messaging';
import { Effect, SubscriptionRef } from 'effect';

const claimSurfaceForCaller = (
	caller: Endpoint,
): Effect.Effect<void, never, BackgroundEnv> =>
	Effect.gen(function* () {
		const popupConnected = yield* isPopupOpenEffect;
		if (
			shouldClaimMascotNotifySurface({
				claimsFromMessage: true,
				popupConnected,
				senderIsExtensionPopup: isPopupLikeCaller(caller),
			})
		) {
			yield* rememberMascotUiSurfaceFromCaller(caller);
		}
	});

export const startCollectionJob = (
	caller: Endpoint,
): Effect.Effect<void, never, BackgroundEnv> =>
	Effect.gen(function* () {
		yield* rememberOverlayHandoffFromCaller(caller);
		yield* claimSurfaceForCaller(caller);
		yield* dispatchEffect(StartCollection());
	});

export const cancelCollectionJob = (
	caller: Endpoint,
): Effect.Effect<void, never, BackgroundEnv> =>
	Effect.gen(function* () {
		yield* resetOverlayHandoffEffect();
		yield* claimSurfaceForCaller(caller);
		yield* dispatchEffect(CancelCollection());
	});

export const downloadExportJob = (
	caller: Endpoint,
	format: ExportFormatId,
): Effect.Effect<string, ExportUnavailable, BackgroundEnv> =>
	Effect.gen(function* () {
		yield* claimSurfaceForCaller(caller);
		yield* dispatchEffect(DownloadExport());
		const stateRef = yield* StateRefTag;
		const state = yield* SubscriptionRef.get(stateRef);
		if (isSaving(state)) {
			return renderExportBody(format, state.tracks);
		}
		return yield* Effect.fail(
			new ExportUnavailable({ status: collectionStateToStatus(state) }),
		);
	});

export const dispatchJob = (
	event: CollectionEvent,
): Effect.Effect<void, never, BackgroundEnv> => dispatchEffect(event);
