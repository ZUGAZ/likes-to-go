/** Copy for a Beat surface that lost its background connection. */
export function backgroundUnreachableMessage(reason: string): string {
	return `Could not reach the extension. ${reason}`;
}
