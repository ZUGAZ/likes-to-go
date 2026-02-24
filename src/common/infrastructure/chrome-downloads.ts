/**
 * UTF-8 string to base64. Required because MV3 service workers do not support
 * URL.createObjectURL(blob); chrome.downloads.download needs a data URL.
 */
function base64EncodeUtf8(str: string): string {
	const bytes = new TextEncoder().encode(str);
	let binary = '';
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary);
}

/**
 * Trigger a download of a JSON string via chrome.downloads.
 * Filename uses timestamp: likes-to-go-YYYY-MM-DD.json.
 * Uses a data URL (base64) because blob URLs are not supported in MV3 service workers.
 */
export function downloadJson(jsonString: string): Promise<void> {
	const filename = `likes-to-go-${new Date().toISOString().slice(0, 10)}.json`;
	const url = `data:application/json;base64,${base64EncodeUtf8(jsonString)}`;
	return new Promise((resolve, reject) => {
		chrome.downloads.download({ url, filename, saveAs: true }, () => {
			if (chrome.runtime.lastError) {
				reject(new Error(chrome.runtime.lastError.message));
			} else {
				resolve();
			}
		});
	});
}
