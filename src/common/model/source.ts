import { Schema } from 'effect';

export const SourceSchema = Schema.Literal(
	'active-soundcloud-tab',
	'likes-page',
);

export type Source = Schema.Schema.Type<typeof SourceSchema>;

export const DEFAULT_SOURCE: Source = 'likes-page';
