import { Schema } from 'effect';

export const LayoutSchema = Schema.Literal('Badges', 'List', 'Unknown');

export type Layout = Schema.Schema.Type<typeof LayoutSchema>;

export const isLayout = Schema.is(LayoutSchema);
