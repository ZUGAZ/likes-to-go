import { describe, expect, it } from 'vitest';
import { requestMessageToCollectionEvent } from '@/common/model/collection/request-message-to-event';
import {
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
});
