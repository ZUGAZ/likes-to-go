import { LOGIN_REQUIRED_MESSAGE } from '@/common/model/collection/login-required-message';
import { ErrorBlock } from '@/popup/components/error-block/error-block';
import type { PopupState } from '@/popup/components/popup/model';
import { ProcessingHeart } from '@/popup/components/processing-heart/processing-heart';
import { Match, Show, Switch, type Accessor } from 'solid-js';
import { Transition } from 'solid-transition-group';

interface PopupViewProps {
	state: Accessor<PopupState>;
	trackCount: Accessor<number>;
	errorMessage: Accessor<string | undefined>;
	skippedTrackCount: Accessor<number>;
	onStart: () => void;
	onRetryFromError: () => void;
	onCancel: () => void;
	onDownload: () => void;
}

export function PopupView(props: PopupViewProps) {
	return (
		<div class="w-[280px] overflow-x-hidden p-4 font-sans text-sm">
			<Transition name="fade" mode="outin">
				<Switch fallback={null}>
					<Match when={props.state() === 'initializing'}>
						<div class="flex flex-col items-center gap-3">
							<div class="text-2xl">
								<ProcessingHeart />
							</div>
							<p class="text-neutral-700">Loading…</p>
						</div>
					</Match>

					<Match when={props.state() === 'initial'}>
						<div class="flex flex-col items-center gap-2">
							<button
								type="button"
								class="rounded bg-neutral-900 px-4 py-2 text-white hover:bg-neutral-800 ring-1 ring-rose-200/40"
								onClick={() => props.onStart()}
							>
								❤️ Likes to go
							</button>
							<p class="text-neutral-600">Waiting for order</p>
						</div>
					</Match>

					<Match when={props.state() === 'loading'}>
						<div class="flex flex-col items-center gap-3">
							<div class="text-2xl">
								<ProcessingHeart />
							</div>
							<p class="text-neutral-700">Starting…</p>
						</div>
					</Match>

					<Match when={props.state() === 'checking-login'}>
						<div class="flex flex-col items-center gap-3">
							<div class="text-2xl">
								<ProcessingHeart />
							</div>
							<p class="text-neutral-700">Checking login status…</p>
							<button
								type="button"
								class="rounded border border-neutral-300 px-3 py-1.5 hover:bg-neutral-100"
								onClick={() => props.onCancel()}
							>
								Cancel order
							</button>
						</div>
					</Match>

					<Match when={props.state() === 'processing'}>
						<div class="flex flex-col items-center gap-3">
							<div class="text-2xl">
								<ProcessingHeart />
							</div>
							<p class="text-neutral-700">
								Collecting likes… ({props.trackCount()} found)
							</p>
							<Show when={props.skippedTrackCount() > 0} fallback={null}>
								<p class="text-center text-amber-600 text-xs">
									{props.skippedTrackCount()} tracks could not be read yet
								</p>
							</Show>
							<button
								type="button"
								class="rounded border border-neutral-300 px-3 py-1.5 hover:bg-neutral-100"
								onClick={() => props.onCancel()}
							>
								Cancel order
							</button>
						</div>
					</Match>

					<Match when={props.state() === 'done'}>
						<div class="flex flex-col items-center gap-2">
							<button
								type="button"
								class="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
								onClick={() => props.onDownload()}
							>
								💚 Ready to go
							</button>
							<p class="text-center text-neutral-700">
								Export ready! {props.trackCount()} tracks collected.
							</p>
							<Show when={props.skippedTrackCount() > 0} fallback={null}>
								<p class="text-center text-amber-600 text-xs">
									{props.skippedTrackCount()} tracks could not be read
								</p>
							</Show>
						</div>
					</Match>

					<Match when={props.state() === 'login-required'}>
						<ErrorBlock
							message={props.errorMessage() ?? LOGIN_REQUIRED_MESSAGE}
							onRetry={props.onRetryFromError}
							variant="login-required"
						/>
					</Match>

					<Match when={props.state() === 'error'}>
						<ErrorBlock
							message={props.errorMessage() ?? 'Something went wrong'}
							onRetry={props.onRetryFromError}
							variant="generic"
						/>
					</Match>
				</Switch>
			</Transition>
		</div>
	);
}
