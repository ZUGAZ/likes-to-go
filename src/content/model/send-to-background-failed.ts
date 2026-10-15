import { Data } from 'effect';

export class SendToBackgroundFailed extends Data.TaggedError(
	'SendToBackgroundFailed',
)<{
	readonly reason: string;
}> {}
