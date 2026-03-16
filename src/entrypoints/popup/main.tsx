import { render } from 'solid-js/web';
import { Effect } from 'effect';

import '@/assets/main.css';

import { makePopupRuntime } from '@/popup/runtime/popup-runtime';
import { PopupRoot } from '@/popup/root';

const root = document.getElementById('root');

if (root) {
	const program = Effect.scoped(
		Effect.gen(function* () {
			const runtime = yield* makePopupRuntime();
			render(() => <PopupRoot runtime={runtime} />, root);
			return yield* Effect.never;
		}),
	);

	void Effect.runPromise(program);
}
