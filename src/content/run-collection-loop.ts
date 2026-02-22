import {
	LIKES_PAGE_BASE_URL,
	MAX_ACTIONS_PER_MINUTE,
	NO_NEW_TRACKS_PASSES,
	WAIT_FOR_NODES_MS,
} from "@/content/constants";
import { decodeTracksFromRaw } from "@/common/infrastructure/decode-tracks-from-raw";
import { getTracksFromRoot } from "@/common/infrastructure/dom-reader";
import { sendToBackground } from "@/common/infrastructure/send-to-background";
import { delayMs, nextDelayMs, rateCapWaitMs } from "@/common/model/pacing";

function scrollToBottom(root: Element): void {
	root.scrollTop = root.scrollHeight;
}

/**
 * Run the collection loop: read DOM, validate, send batch, pace, scroll, wait for new nodes, repeat.
 * Stops when cancelledRef.current is true or after NO_NEW_TRACKS_PASSES passes with no new tracks.
 */
export async function runCollectionLoop(
	root: Element,
	cancelledRef: { current: boolean },
	ctx: { isValid: boolean },
): Promise<void> {
	const actionTimestamps: number[] = [];
	let previousCount = 0;
	let passesWithNoNewTracks = 0;

	while (ctx.isValid && !cancelledRef.current) {
		const raw = getTracksFromRoot(root, LIKES_PAGE_BASE_URL);
		const tracks = decodeTracksFromRaw(raw);
		if (tracks.length > 0) {
			try {
				await sendToBackground({ _tag: "TracksBatch", tracks });
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				await sendToBackground({ _tag: "CollectionError", message });
				return;
			}
		}

		if (raw.length <= previousCount) {
			passesWithNoNewTracks++;
			if (passesWithNoNewTracks >= NO_NEW_TRACKS_PASSES) break;
		} else {
			passesWithNoNewTracks = 0;
		}
		previousCount = raw.length;

		const now = Date.now();
		actionTimestamps.push(now);
		const delay = nextDelayMs();
		const capWait = rateCapWaitMs(actionTimestamps, MAX_ACTIONS_PER_MINUTE, now);
		await delayMs(delay + capWait);

		// Context can be invalidated (e.g. extension reload); check at runtime.
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- ctx.isValid is runtime-checked by WXT.
		if (!ctx.isValid || cancelledRef.current) break;

		scrollToBottom(root);
		await delayMs(WAIT_FOR_NODES_MS);
	}

	// Context can be invalidated; check before sending completion.
	if (ctx.isValid && !cancelledRef.current) {
		await sendToBackground({ _tag: "CollectionComplete" });
	}
}
