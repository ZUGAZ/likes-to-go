import { Layer } from 'effect';

import { HeartLoggerLive } from '@/common/infrastructure/logger';
import type { PopupEnv } from '@/popup/runtime/popup-env';

export const PopupLive: Layer.Layer<PopupEnv> = HeartLoggerLive;

