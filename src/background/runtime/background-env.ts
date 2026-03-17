import type { CommandRunnerTag } from '@/background/command-runner';
import type { StateRefTag } from '@/background/state-ref';

export type BackgroundEnv = StateRefTag | CommandRunnerTag;
