import { Effect } from 'effect';

import { makePopupRuntime } from '@/popup/runtime/popup-runtime';
import type { PopupRuntime } from '@/popup/runtime/popup-runtime-type';
import { popupTimingSnapshot } from '@/popup/popup-boot-timing';

export function startPopup(mountPopup: (runtime: PopupRuntime) => void): void {
	const program = Effect.scoped(
		Effect.gen(function* () {
			yield* Effect.log(
				'action popup startPopup begin',
				popupTimingSnapshot('start-popup-begin'),
			);
			const runtime = yield* makePopupRuntime();
			yield* Effect.log(
				'action popup runtime ready',
				popupTimingSnapshot('runtime-ready'),
			);
			mountPopup(runtime);
			yield* Effect.log(
				'action popup opened',
				popupTimingSnapshot('opened'),
			);
			return yield* Effect.never;
		}),
	);

	void Effect.runPromise(program);
}
