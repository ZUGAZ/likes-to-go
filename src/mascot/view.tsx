import { Match, Show, Switch, type Accessor } from 'solid-js';
import { Transition } from 'solid-transition-group';

import type { BeatActionId, BeatPersonaOption } from '@/mascot/persona';
import type { BeatState } from '@/mascot/model';
import { BeatStatus } from '@/mascot/beat-status';
import { Mascot } from '@/mascot/mascot';
import { SpeechBalloon } from '@/mascot/speech-balloon';
import type { ResolvedPopupTheme } from '@/common/model/soundcloud-theme';

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
		: 'beat-root w-[640px] max-w-[calc(100vw-2rem)] bg-white p-4 font-sans text-neutral-900 text-sm dark:bg-neutral-950 dark:text-neutral-100';

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
						<Switch fallback={null}>
							<Match
								when={
									props.state() === 'initializing' ||
									props.state() === 'initial'
								}
							>
								<div class="beat-layout">
									<Mascot
										poseUrl={props.poseUrl()}
										isAnimating={props.isStatusBusy()}
									/>
									<SpeechBalloon
										copy={props.balloonCopy()}
										options={props.options()}
										footnoteCopy={props.footnoteCopy()}
										onAction={props.onAction}
										onDismiss={props.onDismiss}
									/>
								</div>
							</Match>

							<Match when={props.state() === 'loading'}>
								<div class="beat-layout">
									<Mascot
										poseUrl={props.poseUrl()}
										isAnimating={props.isStatusBusy()}
									/>
									<SpeechBalloon
										copy={props.balloonCopy()}
										options={props.options()}
										footnoteCopy={props.footnoteCopy()}
										onAction={props.onAction}
										onDismiss={props.onDismiss}
									/>
								</div>
							</Match>

							<Match when={props.state() === 'checking-login'}>
								<div class="beat-layout">
									<Mascot
										poseUrl={props.poseUrl()}
										isAnimating={props.isStatusBusy()}
									/>
									<SpeechBalloon
										copy={props.balloonCopy()}
										options={props.options()}
										footnoteCopy={props.footnoteCopy()}
										onAction={props.onAction}
										onDismiss={props.onDismiss}
									/>
								</div>
							</Match>

							<Match when={props.state() === 'processing'}>
								<div class="beat-layout">
									<Mascot
										poseUrl={props.poseUrl()}
										isAnimating={props.isStatusBusy()}
									/>
									<SpeechBalloon
										copy={props.balloonCopy()}
										options={props.options()}
										footnoteCopy={props.footnoteCopy()}
										onAction={props.onAction}
										onDismiss={props.onDismiss}
									/>
								</div>
							</Match>

							<Match when={props.state() === 'paused'}>
								<div class="beat-layout">
									<Mascot
										poseUrl={props.poseUrl()}
										isAnimating={props.isStatusBusy()}
									/>
									<SpeechBalloon
										copy={props.balloonCopy()}
										options={props.options()}
										footnoteCopy={props.footnoteCopy()}
										onAction={props.onAction}
										onDismiss={props.onDismiss}
									/>
								</div>
							</Match>

							<Match when={props.state() === 'done'}>
								<div class="beat-layout">
									<Mascot
										poseUrl={props.poseUrl()}
										isAnimating={props.isStatusBusy()}
									/>
									<SpeechBalloon
										copy={props.balloonCopy()}
										options={props.options()}
										footnoteCopy={props.footnoteCopy()}
										onAction={props.onAction}
										onDismiss={props.onDismiss}
									/>
								</div>
							</Match>

							<Match when={props.state() === 'login-required'}>
								<div class="beat-layout">
									<Mascot
										poseUrl={props.poseUrl()}
										isAnimating={props.isStatusBusy()}
									/>
									<SpeechBalloon
										copy={props.balloonCopy()}
										options={props.options()}
										footnoteCopy={props.footnoteCopy()}
										isError={true}
										onAction={props.onAction}
										onDismiss={props.onDismiss}
									/>
								</div>
							</Match>

							<Match when={props.state() === 'error'}>
								<div class="beat-layout">
									<Mascot
										poseUrl={props.poseUrl()}
										isAnimating={props.isStatusBusy()}
									/>
									<SpeechBalloon
										copy={props.balloonCopy()}
										options={props.options()}
										footnoteCopy={props.footnoteCopy()}
										isError={true}
										onAction={props.onAction}
										onDismiss={props.onDismiss}
									/>
								</div>
							</Match>
						</Switch>
					</Transition>
				</BeatStatus>
			</main>
		</Show>
	);
}
