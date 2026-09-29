import { Layer } from 'effect';

import { SpanLoggerLive } from '@/common/infrastructure/logger';
import type { PopupEnv } from '@/popup/runtime/popup-env';

export const PopupLive: Layer.Layer<PopupEnv> = SpanLoggerLive;
