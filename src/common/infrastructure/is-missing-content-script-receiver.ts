export function isMissingContentScriptReceiverReason(reason: string): boolean {
	return (
		reason.includes('Receiving end does not exist') ||
		reason.includes('Could not establish connection')
	);
}
