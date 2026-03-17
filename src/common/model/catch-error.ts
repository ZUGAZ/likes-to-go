import { errorToReason } from './error-to-reason';

type ErrorWithReason = { readonly message: string; readonly reason: string };

type TaggedError<E extends ErrorWithReason> = (args: ErrorWithReason) => E;

export const catchError =
	<E extends ErrorWithReason>(taggedError: TaggedError<E>, message: string) =>
	(err: unknown): E =>
		taggedError({
			message,
			reason: errorToReason(err),
		});
