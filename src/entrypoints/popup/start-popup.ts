import { Effect } from 'effect';

import { makePopupRuntime } from '@/popup/runtime/popup-runtime';
import type { PopupRuntime } from '@/popup/runtime/popup-runtime-type';

export function startPopup(mountPopup: (runtime: PopupRuntime) => void): void {
	const program = Effect.scoped(
		Effect.gen(function* () {
			const runtime = yield* makePopupRuntime();
			mountPopup(runtime);
			yield* Effect.log('popup opened');
			return yield* Effect.never;
		}),
	);

	void Effect.runPromise(program);
}
