import { Context, Effect, Layer } from 'effect';

export interface DocumentVisibility {
	readonly isHidden: () => Effect.Effect<boolean>;
}

export class DocumentVisibilityTag extends Context.Tag('DocumentVisibility')<
	DocumentVisibilityTag,
	DocumentVisibility
>() {}

export const DocumentVisibilityLive: Layer.Layer<DocumentVisibilityTag> =
	Layer.succeed(DocumentVisibilityTag, {
		isHidden: () =>
			Effect.sync(
				() => document.hidden || document.visibilityState === 'hidden',
			),
	});
