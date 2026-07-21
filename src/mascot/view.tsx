import { Show, type Accessor } from 'solid-js';
import { Transition } from 'solid-transition-group';

import type { ResolvedPopupTheme } from '@/common/model/soundcloud-theme';
import { BeatStatus } from '@/mascot/beat-status';
import { Mascot } from '@/mascot/mascot';
import type { BeatState } from '@/mascot/model';
import type { BeatActionId, BeatPersonaOption } from '@/mascot/persona';
import { SpeechBalloon } from '@/mascot/speech-balloon';

export type BeatPresentation = 'popup' | 'overlay';

export interface BeatViewProps {
	readonly presentation?: BeatPresentation;
	readonly theme: Accessor<ResolvedPopupTheme>;
	readonly state: Accessor<BeatState>;
	readonly isVisible: Accessor<boolean>;
	readonly poseUrl: Accessor<string>;
	readonly isStatusBusy: Accessor<boolean>;
	readonly balloonCopy: Accessor<string>;
	readonly options: Accessor<ReadonlyArray<BeatPersonaOption>>;
	readonly footnoteCopy: Accessor<string | undefined>;
	readonly liveStatusMessage: Accessor<string | undefined>;
	readonly onAction: (actionId: BeatActionId) => void;
	readonly onDismiss?: () => void;
}

const beatRootClass = (presentation: BeatPresentation | undefined) =>
	presentation === 'overlay'
		? 'beat-root w-[640px] max-w-[calc(100vw-2rem)] bg-transparent font-sans text-sm'
		: /* Popup: fixed width — avoid max-w/100vw shrink-wrap in the action popup. */
			'beat-root w-[640px] bg-white p-4 font-sans text-neutral-900 text-sm dark:bg-neutral-950 dark:text-neutral-100';

/** Boot (`initializing`) shares a fade key with `initial` so syncState does not out-in exit. */
const beatFadeKey = (state: BeatState): BeatState =>
	state === 'initializing' ? 'initial' : state;

const isErrorBeatState = (state: BeatState): boolean =>
	state === 'error' || state === 'login-required';

export function BeatView(props: BeatViewProps) {
	return (
		<Show when={props.isVisible()}>
			<main
				class={beatRootClass(props.presentation)}
				data-theme={props.theme()}
				style={{ 'color-scheme': props.theme() }}
			>
				<h1 class="sr-only">Likes to Go</h1>
				<BeatStatus
					busy={props.isStatusBusy()}
					liveMessage={props.liveStatusMessage()}
				>
					<Transition name="fade" mode="outin">
						<Show when={beatFadeKey(props.state())} keyed>
							{(state) => (
								<div class="beat-layout">
									<Mascot
										poseUrl={props.poseUrl()}
										isAnimating={props.isStatusBusy()}
									/>
									<SpeechBalloon
										copy={props.balloonCopy()}
										options={props.options()}
										footnoteCopy={props.footnoteCopy()}
										isError={isErrorBeatState(state)}
										onAction={props.onAction}
										onDismiss={props.onDismiss}
									/>
								</div>
							)}
						</Show>
					</Transition>
				</BeatStatus>
			</main>
		</Show>
	);
}
