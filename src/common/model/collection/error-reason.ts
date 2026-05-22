import { Schema } from 'effect';

export const ErrorReasonSchema = Schema.Literal(
	'login-required',
	'source-invalidated',
	'collection-failed',
	'tab-create-failed',
	'download-failed',
);

export type ErrorReason = Schema.Schema.Type<typeof ErrorReasonSchema>;

export function isLoginRequiredReason(reason: ErrorReason): boolean {
	return reason === 'login-required';
}
