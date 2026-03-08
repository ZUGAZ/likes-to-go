import { Context, Effect, Layer } from 'effect';

export interface Scroller {
	readonly scrollToBottom: () => Effect.Effect<void>;
}

export class ScrollerTag extends Context.Tag('Scroller')<
	ScrollerTag,
	Scroller
>() {}

export const ScrollerLive: Layer.Layer<ScrollerTag> = Layer.succeed(
	ScrollerTag,
	{
		scrollToBottom: () =>
			Effect.sync(() => window.scrollTo(0, document.body.scrollHeight)),
	},
);
