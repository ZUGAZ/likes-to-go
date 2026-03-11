import { Effect, Layer, Ref } from 'effect';
import { CommandRunnerTag } from '@/background/command-runner';
import { StateRefTag } from '@/background/state-ref';
import {
	dispatchEffect,
	handleMessageEffect,
} from '@/background/background-dispatch';
import { initialCollectionState } from '@/common/model/collection/transition';
import { isCollecting } from '@/common/model/collection/states/collecting';
import { StartCollection } from '@/common/model/collection/events/start-collection';
import { TabCreated } from '@/common/model/collection/events/tab-created';
import {
	GetStateRequest,
	StartCollectionRequest,
	type GetStateResponse,
} from '@/common/model/request-message';
import { describe, expect, it } from 'vitest';

function makeStubCommandRunner(
	recordedCommands: Array<{ _tag: string; [k: string]: unknown }>,
): Layer.Layer<CommandRunnerTag> {
	return Layer.succeed(CommandRunnerTag, {
		run: (cmd) => {
			recordedCommands.push({ ...cmd });
			return Effect.void;
		},
	});
}

describe('background dispatch', () => {
	it('dispatchEffect(StartCollection) transitions to CollectingRequested and runs CreateTab; re-dispatch TabCreated yields Collecting', async () => {
		const recordedCommands: Array<{ _tag: string; [k: string]: unknown }> = [];
		const stateRefLayer = Layer.effect(
			StateRefTag,
			Ref.make(initialCollectionState),
		);
		const runnerLayer = makeStubCommandRunner(recordedCommands);
		const testLayer = Layer.mergeAll(stateRefLayer, runnerLayer);

		const program = Effect.gen(function* () {
			yield* dispatchEffect(StartCollection());
			yield* dispatchEffect(TabCreated({ tabId: 42 }));
			const ref = yield* StateRefTag;
			return yield* Ref.get(ref);
		}).pipe(Effect.provide(testLayer));

		const state = await Effect.runPromise(program);

		expect(recordedCommands.length).toBe(1);
		expect(recordedCommands[0]).toMatchObject({
			_tag: 'CreateTab',
			url: 'https://soundcloud.com/you/likes',
		});
		expect(isCollecting(state)).toBe(true);
		if (isCollecting(state)) {
			expect(state.tabId).toBe(42);
			expect(state.tracks).toEqual([]);
		}
	});

	it('handleMessageEffect(GetStateRequest) returns idle state when ref is Idle', async () => {
		const recordedCommands: Array<{ _tag: string; [k: string]: unknown }> = [];
		const stateRefLayer = Layer.effect(
			StateRefTag,
			Ref.make(initialCollectionState),
		);
		const runnerLayer = makeStubCommandRunner(recordedCommands);
		const testLayer = Layer.mergeAll(stateRefLayer, runnerLayer);

		const program = handleMessageEffect(
			GetStateRequest(),
			{} as chrome.runtime.MessageSender,
		).pipe(
			Effect.provide(testLayer),
			Effect.tap((response: GetStateResponse) =>
				Effect.sync(() => {
					expect(response).toMatchObject({
						status: 'idle',
						trackCount: 0,
					});
				}),
			),
		);

		await Effect.runPromise(program);

		expect(recordedCommands.length).toBe(0);
	});

	it('handleMessageEffect(StartCollectionRequest) dispatches and returns state after runner yields TabCreated', async () => {
		const recordedCommands: Array<{ _tag: string; [k: string]: unknown }> = [];
		const stateRefLayer = Layer.effect(
			StateRefTag,
			Ref.make(initialCollectionState),
		);
		const runnerLayer = makeStubCommandRunner(recordedCommands);
		const testLayer = Layer.mergeAll(stateRefLayer, runnerLayer);

		const program = handleMessageEffect(
			StartCollectionRequest(),
			{} as chrome.runtime.MessageSender,
		).pipe(
			Effect.provide(testLayer),
			Effect.tap((response: GetStateResponse) =>
				Effect.sync(() => {
					expect(response).toMatchObject({
						status: 'collecting',
						trackCount: 0,
					});
				}),
			),
		);

		await Effect.runPromise(program);

		expect(recordedCommands.length).toBe(1);
		expect(recordedCommands[0]).toMatchObject({ _tag: 'CreateTab' });
	});
});
