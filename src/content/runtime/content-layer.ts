import { SpanLoggerLive } from '@/common/infrastructure/logger';

/**
 * Shared content-script Layer.
 *
 * Currently this only installs the span logger, but more services
 * can be merged in here over time without changing call sites.
 */
export const ContentLive = SpanLoggerLive;
