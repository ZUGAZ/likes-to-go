import { SpanLoggerLive } from '@/common/infrastructure/logger';
import { CollectionBackendLegacy } from '@/mascot/infrastructure/collection-backend-legacy';
import type { ContentEnv } from '@/content/runtime/content-env';
import { Layer } from 'effect';

/**
 * Shared content-script Layer.
 * The Beat overlay reads collection state from {@link CollectionBackendLegacy}.
 */
export const ContentLive: Layer.Layer<ContentEnv> =
	CollectionBackendLegacy.pipe(Layer.provideMerge(SpanLoggerLive));
