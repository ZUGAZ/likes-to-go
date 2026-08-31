import { Effect } from 'effect';

import { connectPopupPort } from '@/popup/infrastructure/connect-popup-port';
import { makePopupRuntime } from '@/popup/runtime/popup-runtime';
import type { PopupRuntime } from '@/popup/runtime/popup-runtime-type';

export function startPopup(mountPopup: (runtime: PopupRuntime) => void): void {
	const program = Effect.scoped(
		Effect.gen(function* () {
			const runtime = yield* makePopupRuntime();
			yield* Effect.sync(connectPopupPort);
			mountPopup(runtime);
			yield* Effect.log('popup opened');
			return yield* Effect.never;
		}),
	);

	void Effect.runPromise(program);
}
