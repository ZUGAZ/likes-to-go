import { describe, expect, it } from 'vitest';
import { requestMessageToCollectionEvent } from '@/common/model/collection/request-message-to-event';
import {
	CollectionVisibilityPausedRequest,
	CollectionVisibilityResumedRequest,
	DownloadCancelledRequest,
	DownloadFailedRequest,
	DownloadSucceededRequest,
	GetStateRequest,
	LoginRequiredRequest,
	StartCollectionRequest,
} from '@/common/model/request-message';

describe('requestMessageToCollectionEvent', () => {
	it('maps GetStateRequest to GetStateRequested event', () => {
		const event = requestMessageToCollectionEvent(GetStateRequest());
		expect(event).toMatchObject({ _tag: 'GetStateRequested' });
	});

	it('maps StartCollectionRequest to StartCollection event', () => {
		const event = requestMessageToCollectionEvent(StartCollectionRequest());
		expect(event).toMatchObject({ _tag: 'StartCollection' });
	});

	it('maps LoginRequiredRequest to LoginRequired event with message and reason', () => {
		const loginReq = LoginRequiredRequest({
			message: 'Please log in to SoundCloud',
			reason: 'User nav selector not found',
		});
		const event = requestMessageToCollectionEvent(loginReq);
		expect(event).toMatchObject({
			_tag: 'LoginRequired',
			message: 'Please log in to SoundCloud',
			reason: 'User nav selector not found',
		});
	});

	it('maps DownloadSucceededRequest to DownloadSucceeded event', () => {
		expect(
			requestMessageToCollectionEvent(DownloadSucceededRequest()),
		).toMatchObject({ _tag: 'DownloadSucceeded' });
	});

	it('maps DownloadCancelledRequest to DownloadCancelled event', () => {
		expect(
			requestMessageToCollectionEvent(DownloadCancelledRequest()),
		).toMatchObject({ _tag: 'DownloadCancelled' });
	});

	it('maps DownloadFailedRequest to DownloadFailed event', () => {
		expect(
			requestMessageToCollectionEvent(
				DownloadFailedRequest({
					message: 'Could not save your export',
					reason: 'disk',
				}),
			),
		).toMatchObject({
			_tag: 'DownloadFailed',
			message: 'Could not save your export',
			reason: 'disk',
		});
	});

	it('maps visibility pause and resume requests', () => {
		expect(
			requestMessageToCollectionEvent(CollectionVisibilityPausedRequest()),
		).toMatchObject({ _tag: 'CollectionVisibilityPaused' });
		expect(
			requestMessageToCollectionEvent(CollectionVisibilityResumedRequest()),
		).toMatchObject({ _tag: 'CollectionVisibilityResumed' });
	});
});
