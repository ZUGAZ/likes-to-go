import type { CollectionBackendTag } from '@/mascot/collection-backend';

import type { ContentLifetimeTag } from '@/content/runtime/content-lifetime';

/**
 * Base Effect environment for content-script programs.
 *
 * The Beat overlay reads `CollectionBackend`. `ContentLifetime` ends the script.
 * Pipeline services are not in this environment; `PageCollection` closes over them.
 */
export type ContentEnv = CollectionBackendTag | ContentLifetimeTag;
