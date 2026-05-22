export function parseUrl(rawUrl: string): URL | undefined {
	try {
		return new URL(rawUrl);
	} catch {
		return undefined;
	}
}
