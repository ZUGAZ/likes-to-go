import {
	LIKES_PAGE_BASE_URL,
	MAX_ACTIONS_PER_MINUTE,
	NO_NEW_TRACKS_PASSES,
	WAIT_FOR_NODES_MS,
} from '@/content/constants';
import { collectBatches } from '@/content/collect-batches';
import { sendToBackground } from '@/common/infrastructure/send-to-background';
import { delayMs, nextDelayMs, rateCapWaitMs } from '@/common/model/pacing';

function scrollToBottom(): void {
	window.scrollTo(0, document.body.scrollHeight);
}

/**
 * Run the collection loop: drive collectBatches generator, send each batch, pace, scroll, wait.
 * Only validated tracks are sent; invalid cards are skipped. Stops when cancelled or after NO_NEW_TRACKS_PASSES with no new cards.
 */
export async function runCollectionLoop(
	root: Element,
	cancelledRef: { current: boolean },
	ctx: { isValid: boolean },
): Promise<void> {
	const actionTimestamps: number[] = [];
	const generator = collectBatches(root, LIKES_PAGE_BASE_URL, NO_NEW_TRACKS_PASSES);

	for (const batch of generator) {
		if (batch.rawLength > batch.tracks.length) {
			console.log(
				'[likes-to-go] content skipped invalid cards',
				batch.rawLength - batch.tracks.length,
				'raw:',
				batch.rawLength,
				'validated:',
				batch.tracks.length,
			);
		}
		if (batch.tracks.length > 0) {
			try {
				console.log('[likes-to-go] content sending TracksBatch', batch.tracks.length);
				await sendToBackground({ _tag: 'TracksBatch', tracks: [...batch.tracks] });
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				await sendToBackground({ _tag: 'CollectionError', message });
				return;
			}
		}

		const now = Date.now();
		actionTimestamps.push(now);
		const delay = nextDelayMs();
		const capWait = rateCapWaitMs(
			actionTimestamps,
			MAX_ACTIONS_PER_MINUTE,
			now,
		);
		await delayMs(delay + capWait);

		if (!ctx.isValid || cancelledRef.current) break;

		scrollToBottom();
		await delayMs(WAIT_FOR_NODES_MS);
	}

	if (ctx.isValid && !cancelledRef.current) {
		console.log('[likes-to-go] content sending CollectionComplete');
		await sendToBackground({ _tag: 'CollectionComplete' });
	}
}
