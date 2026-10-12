import { BackgroundClientTag } from '@/common/infrastructure/background-client';
import type { ExportFormatId } from '@/common/model/export-format/export-format-id';
import { ExportUnavailable } from '@/common/model/messaging/background-rpcs';
import {
	BackgroundUnreachable,
	CollectionBackendTag,
} from '@/mascot/collection-backend';
import { RpcClientError } from '@effect/rpc/RpcClientError';
import {
	Disconnected,
	ExtensionContextInvalidated,
	StateStatus,
	subscribeState,
	Timeout,
	withPortErrors,
	type PortRpcError,
} from 'browser-extension-kit/messaging';
import { Effect, Layer, Schema, Stream } from 'effect';

const isDisconnected = Schema.is(Disconnected);
const isTimeout = Schema.is(Timeout);
const isExtensionContextInvalidated = Schema.is(ExtensionContextInvalidated);
const isRpcClientError = Schema.is(RpcClientError);
const isExportUnavailable = Schema.is(ExportUnavailable);

/** Diagnostic text for a port failure. */
export function portErrorReason(error: PortRpcError): string {
	if (!isDisconnected(error)) {
		return error._tag;
	}
	if (error.detail === undefined) {
		return error._tag;
	}
	return `Disconnected: ${error.detail}`;
}

const toUnreachable = (error: PortRpcError): BackgroundUnreachable =>
	new BackgroundUnreachable({ reason: portErrorReason(error) });

const portErrorFromClient = (error: RpcClientError): PortRpcError => {
	const cause = error.cause;
	if (isDisconnected(cause)) {
		return cause;
	}
	if (isExtensionContextInvalidated(cause)) {
		return cause;
	}
	return new Disconnected({ detail: error.message });
};

const unreachableFromTransport = (
	error: RpcClientError | PortRpcError,
): BackgroundUnreachable => {
	if (isDisconnected(error)) {
		return toUnreachable(error);
	}
	if (isTimeout(error)) {
		return toUnreachable(error);
	}
	if (isExtensionContextInvalidated(error)) {
		return toUnreachable(error);
	}
	if (isRpcClientError(error)) {
		return toUnreachable(portErrorFromClient(error));
	}
	return new BackgroundUnreachable({ reason: 'Disconnected' });
};

const command = (call: Effect.Effect<void, RpcClientError>) =>
	call.pipe(
		withPortErrors(),
		Effect.mapError(unreachableFromTransport),
		Effect.asVoid,
		Effect.withLogSpan('CollectionBackend'),
	);

const isReconnecting = StateStatus.$is('Reconnecting');

export const CollectionBackendRpc: Layer.Layer<
	CollectionBackendTag,
	never,
	BackgroundClientTag
> = Layer.effect(
	CollectionBackendTag,
	Effect.gen(function* () {
		const { client, connection } = yield* BackgroundClientTag;

		return {
			collectionUpdates: Stream.unwrap(
				Effect.sync(() =>
					subscribeState(client.WatchCollectionState(), connection).pipe(
						Stream.tap((status) =>
							isReconnecting(status)
								? Effect.logDebug('collection updates reconnecting')
								: Effect.void,
						),
						Stream.flatMap(
							StateStatus.$match({
								Connecting: () => Stream.empty,
								Live: ({ value }) => Stream.make(value),
								Reconnecting: () => Stream.empty,
								Terminated: ({ error }) => Stream.fail(toUnreachable(error)),
							}),
						),
					),
				),
			),
			refresh: command(client.RefreshCollectionState()),
			startCollection: command(client.StartCollection()),
			cancelCollection: command(client.CancelCollection()),
			downloadExport: (format: ExportFormatId) =>
				client.DownloadExport({ format }).pipe(
					withPortErrors(),
					Effect.mapError(
						(error): ExportUnavailable | BackgroundUnreachable => {
							if (isExportUnavailable(error)) {
								return error;
							}
							return unreachableFromTransport(error);
						},
					),
					Effect.withLogSpan('CollectionBackend'),
				),
			downloadSucceeded: command(client.DownloadSucceeded()),
			downloadCancelled: command(client.DownloadCancelled()),
			downloadFailed: (failure) => command(client.DownloadFailed(failure)),
		};
	}),
);
