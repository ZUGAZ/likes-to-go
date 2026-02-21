import { Schema } from "effect";

/**
 * Builds a struct schema with a single _tag literal; use for tagged message variants.
 * Effect's Literal schema is typed as Literal<readonly [LiteralValue, ...]>.
 */
export function taggedStruct<Tag extends string>(
	tag: Tag,
): Schema.Struct<{ readonly _tag: Schema.Literal<readonly [Tag]> }>;
export function taggedStruct<Tag extends string, F extends Schema.Struct.Fields>(
	tag: Tag,
	fields: F,
): Schema.Struct<{ readonly _tag: Schema.Literal<readonly [Tag]> } & F>;
export function taggedStruct<Tag extends string, F extends Schema.Struct.Fields>(
	tag: Tag,
	fields?: F,
): Schema.Struct<{ readonly _tag: Schema.Literal<readonly [Tag]> }> | Schema.Struct<{ readonly _tag: Schema.Literal<readonly [Tag]> } & F> {
	const base = { _tag: Schema.Literal(tag) };
	return fields ? Schema.Struct({ ...base, ...fields }) : Schema.Struct(base);
}
