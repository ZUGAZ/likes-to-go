/**
 * Trigger a download of a JSON string via chrome.downloads.
 * Filename uses timestamp: likes-to-go-YYYY-MM-DD.json.
 */
export function downloadJson(jsonString: string): Promise<void> {
	const filename = `likes-to-go-${new Date().toISOString().slice(0, 10)}.json`;
	const blob = new Blob([jsonString], { type: "application/json" });
	const url = URL.createObjectURL(blob);
	return new Promise((resolve, reject) => {
		chrome.downloads.download(
			{ url, filename, saveAs: true },
			() => {
				URL.revokeObjectURL(url);
				if (chrome.runtime.lastError) {
					reject(new Error(chrome.runtime.lastError.message));
				} else {
					resolve();
				}
			},
		);
	});
}
