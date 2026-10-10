import {
	CONTENT_TOP_FRAME_ID,
	ContentCommandsTag,
	receiverGoneToSendToTabFailed,
} from '@/background/content-commands';
import { ContentRpcs } from '@/common/model/messaging/content-rpcs';
import { CONTENT_RPC_PORT_NAME } from '@/common/model/messaging/port-names';
import {
	Content,
	Disconnected,
	makeContentClients,
	PortConnector,
	PortRpcError,
	Presence,
	ReceiverUnavailable,
	withPortErrors,
} from 'browser-extension-kit/messaging';
import { RpcClientError } from '@effect/rpc/RpcClientError';
import { Duration, Effect, Layer, Schedule, Schema } from 'effect';

/**
 * Calls content over ContentRpcs.
 * Production switches to this layer only once content serves ContentRpcs
 * on CONTENT_RPC_PORT_NAME.
 */
const isReceiverGone = Schema.is(
	Schema.Union(ReceiverUnavailable, Disconnected),
);

const retrySchedule = (
	tag: string,
	tabId: number,
	delays: readonly [number, ...number[]],
) => {
	const [first, ...rest] = delays;
	return Schedule.fromDelays(
		Duration.millis(first),
		...rest.map((delay) => Duration.millis(delay)),
	).pipe(
		Schedule.tapOutput((delay) =>
			Effect.log('retry', {
				tag,
				tabId,
				delay: Duration.toMillis(delay),
			}),
		),
	);
};

const withReceiverRetry =
	(tag: string, tabId: number, delays: readonly [number, ...number[]]) =>
	<A, E, R>(self: Effect.Effect<A, E, R>) =>
		self.pipe(
			Effect.retry({
				schedule: retrySchedule(tag, tabId, delays),
				while: (error: E) => isReceiverGone(error),
			}),
		);

const endpointFor = (tabId: number) =>
	new Content({ tabId, frameId: CONTENT_TOP_FRAME_ID });

const isRpcClientError = Schema.is(RpcClientError);

const withoutClientError = <A, R>(
	self: Effect.Effect<A, RpcClientError, R>,
): Effect.Effect<A, PortRpcError, R> =>
	self.pipe(
		withPortErrors(),
		Effect.catchIf(isRpcClientError, (error) =>
			Effect.fail(new Disconnected({ detail: error.message })),
		),
	);

export const ContentCommandsRpc: Layer.Layer<
	ContentCommandsTag,
	never,
	Presence | PortConnector
> = Layer.scoped(
	ContentCommandsTag,
	Effect.gen(function* () {
		const clients = yield* makeContentClients(ContentRpcs, {
			name: CONTENT_RPC_PORT_NAME,
		});

		const startPageCollection = (tabId: number) =>
			clients.clientFor(endpointFor(tabId)).pipe(
				Effect.flatMap((client) =>
					withoutClientError(client.StartPageCollection()),
				),
				withReceiverRetry('StartPageCollection', tabId, [200, 400, 800, 1600]),
				Effect.mapError(receiverGoneToSendToTabFailed),
				Effect.withLogSpan('ContentCommands'),
			);

		const cancelPageCollection = (tabId: number) =>
			clients.clientFor(endpointFor(tabId)).pipe(
				Effect.flatMap((client) =>
					withoutClientError(client.CancelPageCollection()),
				),
				Effect.mapError(receiverGoneToSendToTabFailed),
				Effect.withLogSpan('ContentCommands'),
			);

		const swallow = (
			tag: string,
			tabId: number,
			attempt: Effect.Effect<void, ReceiverUnavailable | PortRpcError>,
		) =>
			attempt.pipe(
				Effect.catchAll((error) =>
					Effect.logWarning(`${tag} send failed`, {
						tabId,
						reason: receiverGoneToSendToTabFailed(error).reason,
					}),
				),
				Effect.withLogSpan('ContentCommands'),
			);

		const toggleMascot = (tabId: number) =>
			swallow(
				'ToggleMascot',
				tabId,
				clients.clientFor(endpointFor(tabId)).pipe(
					Effect.flatMap((client) => withoutClientError(client.ToggleMascot())),
					withReceiverRetry('ToggleMascot', tabId, [200, 400, 800]),
				),
			);

		const showMascot = (tabId: number) =>
			swallow(
				'ShowMascot',
				tabId,
				clients.clientFor(endpointFor(tabId)).pipe(
					Effect.flatMap((client) => withoutClientError(client.ShowMascot())),
					withReceiverRetry('ShowMascot', tabId, [200, 400, 800]),
				),
			);

		return {
			startPageCollection,
			cancelPageCollection,
			toggleMascot,
			showMascot,
		};
	}),
);
