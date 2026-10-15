import { isBackground, PortPeers } from 'browser-extension-kit/messaging';
import { Effect, HashMap, HashSet, Layer, Ref, Stream } from 'effect';

/** Logs each newly observed content-server peer. Does not branch on it. */
export const ContentPeerLogLive: Layer.Layer<never, never, PortPeers> =
	Layer.scopedDiscard(
		Effect.gen(function* () {
			const peers = yield* PortPeers;
			const seen = yield* Ref.make(HashSet.empty<number>());
			yield* peers.changes.pipe(
				Stream.runForEach((current) =>
					Effect.gen(function* () {
						const known = yield* Ref.get(seen);
						const entries = HashMap.toEntries(current);
						const fresh = entries.filter(
							([clientId]) => !HashSet.has(known, clientId),
						);
						yield* Ref.set(
							seen,
							HashSet.fromIterable(entries.map(([clientId]) => clientId)),
						);
						yield* Effect.forEach(
							fresh,
							([, peer]) =>
								Effect.log(
									'content rpc peer',
									isBackground(peer) ? 'Background' : 'other',
								),
							{ discard: true },
						);
					}),
				),
				Effect.withLogSpan('ContentRpc'),
				Effect.forkScoped,
			);
		}),
	);
