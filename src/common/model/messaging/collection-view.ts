import { isContent, type Endpoint } from 'browser-extension-kit/messaging';
import { Schema } from 'effect';

import { CollectionStatusSchema } from '@/common/model/collection/collection-status';
import {
	collectionTabId,
	type CollectionState,
} from '@/common/model/collection/state';
import { collectionStateToGetStateResponse } from '@/common/model/collection/state-to-response';
import { SourceSchema } from '@/common/model/source';

/**
 * What a caller sees of the background collection state.
 * Fields match the legacy state response, without the export text.
 * `isCollectionTab` is true only for the content script in the tab being collected.
 */
export class CollectionView extends Schema.Class<CollectionView>(
	'CollectionView',
)({
	status: CollectionStatusSchema,
	trackCount: Schema.Number,
	message: Schema.optional(Schema.String),
	skippedTrackCount: Schema.optional(Schema.Number),
	source: Schema.optional(SourceSchema),
	isCollectionTab: Schema.Boolean,
}) {}

/** Projects collection state into the view for one caller. */
export function collectionStateToView(
	state: CollectionState,
	caller: Endpoint,
): CollectionView {
	const response = collectionStateToGetStateResponse(state);
	const isCollectionTab =
		isContent(caller) && collectionTabId(state) === caller.tabId;

	return new CollectionView({
		status: response.status,
		trackCount: response.trackCount,
		...(response.message !== undefined && { message: response.message }),
		...(response.skippedTrackCount !== undefined && {
			skippedTrackCount: response.skippedTrackCount,
		}),
		...(response.source !== undefined && { source: response.source }),
		isCollectionTab,
	});
}
