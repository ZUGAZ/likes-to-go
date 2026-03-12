import { List, Logger, LogLevel } from 'effect';
import type { LogSpan } from 'effect/LogSpan';

const formatSpans = (spans: List.List<LogSpan>): string =>
	List.toArray(spans)
		.reverse()
		.map((span) => `[${span.label}]`)
		.join('');

export const heartLogger = Logger.make(
	({ logLevel, message, spans }: Logger.Logger.Options<unknown>) => {
		const prefix = formatSpans(spans);
		const parts: ReadonlyArray<unknown> = Array.isArray(message)
			? message
			: [message];

		switch (logLevel) {
			case LogLevel.Error:
				console.error(prefix, ...parts);
				break;
			case LogLevel.Warning:
				console.warn(prefix, ...parts);
				break;
			default:
				console.log(prefix, ...parts);
		}
	},
);

export const HeartLoggerLive = Logger.replace(
	Logger.defaultLogger,
	heartLogger,
);
