import { Effect, Layer, Runtime, Scope } from 'effect';

import type { PopupEnv } from '@/popup/runtime/popup-env';
import { PopupLive } from '@/popup/runtime/popup-layer';

export function makePopupRuntime(): Effect.Effect<
	Runtime.Runtime<PopupEnv>,
	never,
	Scope.Scope
> {
	return Layer.toRuntime(PopupLive).pipe(
		Effect.tap(() => Effect.log('Runtime initialized')),
		Effect.withLogSpan('popup'),
		Effect.withLogSpan('♥️'),
	);
}
