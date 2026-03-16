import type { CommandRunnerTag } from '@/background/command-runner';
import type { PopupNotifierTag } from '@/background/popup-notifier';
import type { StateRefTag } from '@/background/state-ref';

export type BackgroundEnv = StateRefTag | CommandRunnerTag | PopupNotifierTag;
