import { Layer, Ref } from 'effect';
import { initialCollectionState } from '@/common/model/collection';
import { CommandRunnerTag, runCommand } from '@/background/command-runner';
import { StateRefTag } from '@/background/state-ref';

const StateRefLive: Layer.Layer<StateRefTag> = Layer.effect(
	StateRefTag,
	Ref.make(initialCollectionState),
);

const CommandRunnerLive: Layer.Layer<CommandRunnerTag> = Layer.succeed(
	CommandRunnerTag,
	{ run: runCommand },
);

/**
 * Production layer for the background service: state ref + command runner.
 * Built with sync-only acquisition so listener registration can run in the same tick.
 */
export const BackgroundLive: Layer.Layer<StateRefTag | CommandRunnerTag> =
	Layer.mergeAll(StateRefLive, CommandRunnerLive);
