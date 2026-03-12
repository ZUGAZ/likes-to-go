/**
 * Base Effect environment for content-script programs.
 *
 * The collection pipeline-specific services (`DomScannerTag`, `BackgroundSenderTag`,
 * `ScrollerTag`) are provided per-run via `makeCollectionLive(root)`; they are
 * not required in the shared runtime's environment.
 */

export type ContentEnv = never;
