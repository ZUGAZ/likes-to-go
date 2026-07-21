import { expect, test } from './extension-fixture';

test('loads unpacked extension and exposes service worker', ({
	context,
	extensionId,
}) => {
	expect(extensionId).toMatch(/^[a-p]{32}$/);

	const serviceWorkers = context.serviceWorkers();
	expect(serviceWorkers.length).toBeGreaterThan(0);
});
