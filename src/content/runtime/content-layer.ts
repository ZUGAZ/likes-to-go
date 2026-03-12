import { HeartLoggerLive } from '@/common/infrastructure/logger';

/**
 * Shared content-script Layer.
 *
 * Currently this only installs the custom heart logger, but more services
 * can be merged in here over time without changing call sites.
 */
export const ContentLive = HeartLoggerLive;
