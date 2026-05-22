import { parseUrl } from '@/common/model/url/parse-url';

const SOUNDCLOUD_HOSTNAME = 'soundcloud.com';

export function isSoundCloudUrl(rawUrl: string | undefined): boolean {
	if (rawUrl === undefined) return false;

	const url = parseUrl(rawUrl);
	return (
		url?.hostname === SOUNDCLOUD_HOSTNAME &&
		(url.protocol === 'https:' || url.protocol === 'http:')
	);
}
