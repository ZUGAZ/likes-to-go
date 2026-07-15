const OVERLAY_ROOT_POSITION_PROPERTIES = [
	'position',
	'top',
	'right',
	'bottom',
	'left',
] as const;

export function applyBeatOverlayRootStyles(shadow: ShadowRoot): void {
	const shadowHtml = shadow.querySelector('html');
	if (!(shadowHtml instanceof HTMLElement)) {
		return;
	}

	shadowHtml.classList.add('beat-overlay-root');

	for (const property of OVERLAY_ROOT_POSITION_PROPERTIES) {
		shadowHtml.style.removeProperty(property);
	}
}
