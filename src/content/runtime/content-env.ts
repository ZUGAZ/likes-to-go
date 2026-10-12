import type { CollectionBackendTag } from '@/mascot/collection-backend';

/**
 * Base Effect environment for content-script programs.
 *
 * The Beat overlay reads the collection backend from the runtime.
 * The collection pipeline-specific services (`DomScannerTag`, `BackgroundSenderTag`,
 * `ScrollerTag`) are provided per-run via `makeCollectionLive(root, layoutContext)`; they are
 * not required in the shared runtime's environment.
 */
export type ContentEnv = CollectionBackendTag;
