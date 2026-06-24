import type { Runtime } from 'effect';

import type { PopupEnv } from '@/popup/runtime/popup-env';

export type PopupRuntime = Runtime.Runtime<PopupEnv>;
