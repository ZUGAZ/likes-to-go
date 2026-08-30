import { Show } from 'solid-js';

import type { ResolvedPopupTheme } from '@/common/model/soundcloud-theme';
import type { BeatActionId } from '@/mascot/persona';
import {
	mapStateToBalloonCopy,
	mapStateToBusy,
	mapStateToFootnote,
	mapStateToLiveMessage,
	mapStateToOptions,
	mapStateToPose,
	type BeatSource,
	type BeatState,
} from '@/mascot/model';
import { resolveStorybookMascotPoseUrl } from '@/mascot/resolve-storybook-mascot-pose-url';
import { BeatView, type BeatPresentation } from '@/mascot/view';

export type BeatViewStoryArgs = {
	state: BeatState;
	theme: ResolvedPopupTheme;
	presentation: BeatPresentation;
	trackCount: number;
	skippedTrackCount: number;
	message: string | undefined;
	source: BeatSource;
	showDismiss: boolean;
};

const logAction = (actionId: BeatActionId): void => {
	console.info('[BeatView story] action', actionId);
};

const logDismiss = (): void => {
	console.info('[BeatView story] dismiss');
};

const normalizeMessage = (message: string | undefined): string | undefined => {
	if (message === undefined || message === '') {
		return undefined;
	}
	return message;
};

function BeatViewStoryPresentation(props: BeatViewStoryArgs) {
	const buildCopyContext = () => ({
		trackCount: props.trackCount,
		skippedTrackCount: props.skippedTrackCount,
		source: props.source,
		message: normalizeMessage(props.message),
	});

	return (
		<BeatView
			presentation={props.presentation}
			theme={() => props.theme}
			state={() => props.state}
			isVisible={() => true}
			poseUrl={() => resolveStorybookMascotPoseUrl(mapStateToPose(props.state))}
			isStatusBusy={() => mapStateToBusy(props.state)}
			balloonCopy={() => mapStateToBalloonCopy(props.state, buildCopyContext())}
			options={() => mapStateToOptions(props.state)}
			footnoteCopy={() => mapStateToFootnote(props.state, buildCopyContext())}
			liveStatusMessage={() =>
				mapStateToLiveMessage(props.state, buildCopyContext())
			}
			onAction={logAction}
			{...(props.showDismiss ? { onDismiss: logDismiss } : {})}
		/>
	);
}

/**
 * Presentation-only host: plain Storybook args → BeatView accessors.
 * Effect-free; no ViewModel / Chrome.
 */
export function BeatViewStoryHost(props: BeatViewStoryArgs) {
	return (
		<Show
			when={props.presentation === 'overlay'}
			fallback={<BeatViewStoryPresentation {...props} />}
		>
			<div class="flex min-h-[320px] w-[min(100vw,720px)] items-center justify-center bg-neutral-700 p-8">
				<BeatViewStoryPresentation {...props} />
			</div>
		</Show>
	);
}
