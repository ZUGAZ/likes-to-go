import { RpcSchema, type RpcGroup } from '@effect/rpc';
import { Schema } from 'effect';
import { describe, expect, it } from 'vitest';

import type { CollectionCommand } from '@/common/model/collection/command';
import { BackgroundRpcs } from '@/common/model/messaging/background-rpcs';
import { ContentRpcs } from '@/common/model/messaging/content-rpcs';
import type { RequestMessage } from '@/common/model/request-message';
import type { PopupStateUpdate } from '@/common/model/request-message/popup-state-update';

type RpcKind = 'command' | 'fire-and-forget' | 'subscription';

type Destination =
	| {
			readonly group: 'BackgroundRpcs';
			readonly rpc: RpcGroup.Rpcs<typeof BackgroundRpcs>['_tag'];
			readonly kind: RpcKind;
	  }
	| {
			readonly group: 'ContentRpcs';
			readonly rpc: RpcGroup.Rpcs<typeof ContentRpcs>['_tag'];
			readonly kind: RpcKind;
	  };

type LegacyTag =
	| RequestMessage['_tag']
	| PopupStateUpdate['_tag']
	| Extract<
			CollectionCommand['_tag'],
			'SendStartToTab' | 'SendCancelToTab' | 'NotifyPopup'
	  >;

function coveredBy(
	first: Destination,
	...rest: readonly Destination[]
): readonly [Destination, ...Destination[]] {
	return [first, ...rest];
}

const legacyCoverage = {
	StartCollection: coveredBy(
		{
			group: 'BackgroundRpcs',
			rpc: 'StartCollection',
			kind: 'command',
		},
		{
			group: 'ContentRpcs',
			rpc: 'StartPageCollection',
			kind: 'command',
		},
	),
	CancelCollection: coveredBy(
		{
			group: 'BackgroundRpcs',
			rpc: 'CancelCollection',
			kind: 'command',
		},
		{
			group: 'ContentRpcs',
			rpc: 'CancelPageCollection',
			kind: 'command',
		},
	),
	DownloadExport: coveredBy({
		group: 'BackgroundRpcs',
		rpc: 'DownloadExport',
		kind: 'command',
	}),
	DownloadSucceeded: coveredBy({
		group: 'BackgroundRpcs',
		rpc: 'DownloadSucceeded',
		kind: 'command',
	}),
	DownloadCancelled: coveredBy({
		group: 'BackgroundRpcs',
		rpc: 'DownloadCancelled',
		kind: 'command',
	}),
	DownloadFailed: coveredBy({
		group: 'BackgroundRpcs',
		rpc: 'DownloadFailed',
		kind: 'command',
	}),
	GetState: coveredBy(
		{
			group: 'BackgroundRpcs',
			rpc: 'RefreshCollectionState',
			kind: 'command',
		},
		{
			group: 'BackgroundRpcs',
			rpc: 'WatchCollectionState',
			kind: 'subscription',
		},
	),
	TracksBatch: coveredBy({
		group: 'BackgroundRpcs',
		rpc: 'TracksBatch',
		kind: 'fire-and-forget',
	}),
	CollectionComplete: coveredBy({
		group: 'BackgroundRpcs',
		rpc: 'CollectionComplete',
		kind: 'fire-and-forget',
	}),
	CollectionVisibilityPaused: coveredBy({
		group: 'BackgroundRpcs',
		rpc: 'CollectionVisibilityPaused',
		kind: 'fire-and-forget',
	}),
	CollectionVisibilityResumed: coveredBy({
		group: 'BackgroundRpcs',
		rpc: 'CollectionVisibilityResumed',
		kind: 'fire-and-forget',
	}),
	CollectionError: coveredBy({
		group: 'BackgroundRpcs',
		rpc: 'CollectionError',
		kind: 'fire-and-forget',
	}),
	LoginRequired: coveredBy({
		group: 'BackgroundRpcs',
		rpc: 'LoginRequired',
		kind: 'fire-and-forget',
	}),
	ToggleMascot: coveredBy({
		group: 'ContentRpcs',
		rpc: 'ToggleMascot',
		kind: 'command',
	}),
	ShowMascot: coveredBy({
		group: 'ContentRpcs',
		rpc: 'ShowMascot',
		kind: 'command',
	}),
	PopupStateUpdate: coveredBy({
		group: 'BackgroundRpcs',
		rpc: 'WatchCollectionState',
		kind: 'subscription',
	}),
	SendStartToTab: coveredBy({
		group: 'ContentRpcs',
		rpc: 'StartPageCollection',
		kind: 'command',
	}),
	SendCancelToTab: coveredBy({
		group: 'ContentRpcs',
		rpc: 'CancelPageCollection',
		kind: 'command',
	}),
	NotifyPopup: coveredBy({
		group: 'BackgroundRpcs',
		rpc: 'WatchCollectionState',
		kind: 'subscription',
	}),
} satisfies Record<LegacyTag, readonly [Destination, ...Destination[]]>;

function rpcFor(destination: Destination) {
	const requests =
		destination.group === 'BackgroundRpcs'
			? BackgroundRpcs.requests
			: ContentRpcs.requests;
	const rpc = requests.get(destination.rpc);
	if (rpc === undefined) {
		throw new Error(`${destination.group}.${destination.rpc} is missing`);
	}
	return rpc;
}

describe('legacy message coverage', () => {
	it('maps every legacy tag onto a real procedure of the stated kind', () => {
		const backgroundDestinations = new Set<string>();
		const contentDestinations = new Set<string>();

		for (const destinations of Object.values(legacyCoverage)) {
			for (const destination of destinations) {
				const rpc = rpcFor(destination);
				expect(RpcSchema.isStreamSchema(rpc.successSchema)).toBe(
					destination.kind === 'subscription',
				);
				if (destination.kind === 'fire-and-forget') {
					expect(rpc.successSchema).toBe(Schema.Void);
					expect(rpc.errorSchema).toBe(Schema.Never);
				}
				if (destination.group === 'BackgroundRpcs') {
					backgroundDestinations.add(destination.rpc);
				} else {
					contentDestinations.add(destination.rpc);
				}
			}
		}

		expect([...backgroundDestinations].sort()).toEqual(
			[...BackgroundRpcs.requests.keys()].sort(),
		);
		expect([...contentDestinations].sort()).toEqual(
			[...ContentRpcs.requests.keys()].sort(),
		);
	});
});
