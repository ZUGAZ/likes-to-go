import { LOGIN_REQUIRED_MESSAGE } from '@/common/model/collection/login-required-message';
import type { ResolvedPopupTheme } from '@/common/model/soundcloud-theme';
import { ErrorBlock } from '@/popup/components/error-block/error-block';
import type { PopupState } from '@/popup/components/popup/model';
import { PopupStatus } from '@/popup/components/popup-status/popup-status';
import { ProcessingHeart } from '@/popup/components/processing-heart/processing-heart';
import { Match, Show, Switch, type Accessor } from 'solid-js';
import { Transition } from 'solid-transition-group';

interface PopupViewProps {
	theme: Accessor<ResolvedPopupTheme>;
	state: Accessor<PopupState>;
	trackCount: Accessor<number>;
	message: Accessor<string | undefined>;
	skippedTrackCount: Accessor<number>;
	sourceCopy: Accessor<string>;
	isStatusBusy: Accessor<boolean>;
	liveStatusMessage: Accessor<string | undefined>;
	onStart: () => void;
	onRetryFromError: () => void;
	onCancel: () => void;
	onDownload: () => void;
}

export function PopupView(props: PopupViewProps) {
	return (
		<main
			class="w-[280px] overflow-x-hidden bg-white p-4 font-sans text-neutral-900 text-sm dark:bg-neutral-950 dark:text-neutral-100"
			data-theme={props.theme()}
			style={{ 'color-scheme': props.theme() }}
		>
			<h1 class="sr-only">Likes to Go</h1>
			<PopupStatus
				busy={props.isStatusBusy()}
				liveMessage={props.liveStatusMessage()}
			>
				<Transition name="fade" mode="outin">
					<Switch fallback={null}>
						<Match when={props.state() === 'initializing'}>
							<div class="flex flex-col items-center gap-3">
								<div class="text-2xl">
									<ProcessingHeart />
								</div>
								<p class="text-neutral-700 dark:text-neutral-300">Loading…</p>
							</div>
						</Match>

						<Match when={props.state() === 'initial'}>
							<div class="flex flex-col items-center gap-2">
								<button
									type="button"
									class="rounded bg-neutral-900 px-4 py-2 text-white ring-1 ring-rose-200/40 hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 dark:bg-neutral-100 dark:text-neutral-950 dark:ring-rose-300/30 dark:hover:bg-white dark:focus-visible:ring-neutral-100 dark:focus-visible:ring-offset-neutral-950"
									onClick={() => props.onStart()}
								>
									❤️ Likes to go
								</button>
								<p class="text-center text-neutral-600 dark:text-neutral-400">
									{props.sourceCopy()}
								</p>
							</div>
						</Match>

						<Match when={props.state() === 'loading'}>
							<div class="flex flex-col items-center gap-3">
								<div class="text-2xl">
									<ProcessingHeart />
								</div>
								<p class="text-neutral-700 dark:text-neutral-300">Starting…</p>
							</div>
						</Match>

						<Match when={props.state() === 'checking-login'}>
							<div class="flex flex-col items-center gap-3">
								<div class="text-2xl">
									<ProcessingHeart />
								</div>
								<p class="text-neutral-700 dark:text-neutral-300">
									Checking login status…
								</p>
								<button
									type="button"
									class="rounded border border-neutral-300 px-3 py-1.5 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800 dark:focus-visible:ring-neutral-100 dark:focus-visible:ring-offset-neutral-950"
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
								<p class="text-neutral-700 dark:text-neutral-300">
									Collecting likes… ({props.trackCount()} found)
								</p>
								<Show when={props.skippedTrackCount() > 0} fallback={null}>
									<p
										class="text-amber-600 text-center text-xs dark:text-amber-300"
										role="status"
									>
										{props.skippedTrackCount()} tracks could not be read yet
									</p>
								</Show>
								<button
									type="button"
									class="rounded border border-neutral-300 px-3 py-1.5 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800 dark:focus-visible:ring-neutral-100 dark:focus-visible:ring-offset-neutral-950"
									onClick={() => props.onCancel()}
								>
									Cancel order
								</button>
							</div>
						</Match>

						<Match when={props.state() === 'paused'}>
							<div class="flex flex-col items-center gap-3">
								<p class="text-center text-amber-700 dark:text-amber-300">
									{props.message() ?? 'Collection paused.'}
								</p>
								<p class="text-neutral-700 dark:text-neutral-300">
									{props.trackCount()} likes collected so far
								</p>
								<button
									type="button"
									class="rounded border border-neutral-300 px-3 py-1.5 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800 dark:focus-visible:ring-neutral-100 dark:focus-visible:ring-offset-neutral-950"
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
									class="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 dark:bg-green-400 dark:text-neutral-950 dark:hover:bg-green-300 dark:focus-visible:ring-green-300 dark:focus-visible:ring-offset-neutral-950"
									onClick={() => props.onDownload()}
								>
									💚 Ready to go
								</button>
								<p class="text-center text-neutral-700 dark:text-neutral-300">
									Export ready! {props.trackCount()} tracks collected.
								</p>
								<Show when={props.skippedTrackCount() > 0} fallback={null}>
									<p
										class="text-amber-600 text-center text-xs dark:text-amber-300"
										role="status"
									>
										{props.skippedTrackCount()} tracks could not be read
									</p>
								</Show>
							</div>
						</Match>

						<Match when={props.state() === 'login-required'}>
							<ErrorBlock
								message={props.message() ?? LOGIN_REQUIRED_MESSAGE}
								onRetry={props.onRetryFromError}
								variant="login-required"
							/>
						</Match>

						<Match when={props.state() === 'error'}>
							<ErrorBlock
								message={props.message() ?? 'Something went wrong'}
								onRetry={props.onRetryFromError}
								variant="generic"
							/>
						</Match>
					</Switch>
				</Transition>
			</PopupStatus>
		</main>
	);
}
