import { Schema } from 'effect';

export const COLLECTION_STATUSES = [
	'idle',
	'checking-login',
	'collecting',
	'paused',
	'done',
	'saving',
	'login-required',
	'error',
] as const;

export type CollectionStatus = (typeof COLLECTION_STATUSES)[number];

export const CollectionStatusSchema = Schema.Literal(...COLLECTION_STATUSES);
