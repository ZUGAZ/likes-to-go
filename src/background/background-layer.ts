import { Layer, Ref } from 'effect';
import { HeartLoggerLive } from '@/common/infrastructure/logger';
import { initialCollectionState } from '@/common/model/collection/transition';
import { CommandRunnerTag, runCommand } from '@/background/command-runner';
import { PopupNotifierLive, PopupNotifierTag } from '@/background/popup-notifier';
import { StateRefTag } from '@/background/state-ref';

const StateRefLive: Layer.Layer<StateRefTag> = Layer.effect(
	StateRefTag,
	Ref.make(initialCollectionState),
);

const CommandRunnerLive: Layer.Layer<CommandRunnerTag> = Layer.succeed(
	CommandRunnerTag,
	{ run: runCommand },
);

export const BackgroundLive: Layer.Layer<
	StateRefTag | CommandRunnerTag | PopupNotifierTag
> = Layer.mergeAll(
	StateRefLive,
	CommandRunnerLive,
	PopupNotifierLive,
	HeartLoggerLive,
);
