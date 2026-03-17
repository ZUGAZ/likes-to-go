import { Data } from 'effect';

/**
 * Invalid runtime message (e.g. from Chrome messaging). Payload failed validation.
 */
export class InvalidMessage extends Data.TaggedError('InvalidMessage')<{
	readonly reason: string;
}> {}
