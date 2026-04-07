import { describe, expect, it } from 'vitest';
import { requestMessageToCollectionEvent } from '@/common/model/collection/request-message-to-event';
import {
	GetStateRequest,
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
});
