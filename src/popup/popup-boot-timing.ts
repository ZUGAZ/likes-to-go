export type PopupBootMark = {
	readonly wallMs: number;
	readonly perfMs: number;
};

const isPopupBootMark = (value: unknown): value is PopupBootMark => {
	if (typeof value !== 'object' || value === null) {
		return false;
	}
	if (!('wallMs' in value) || !('perfMs' in value)) {
		return false;
	}
	return typeof value.wallMs === 'number' && typeof value.perfMs === 'number';
};

/** Read the inline boot mark from popup `index.html`, if present. */
export const readPopupBootMark = (): PopupBootMark | undefined => {
	const mark = Reflect.get(globalThis, '__LikesToGoPopupBoot');
	return isPopupBootMark(mark) ? mark : undefined;
};

export const popupTimingSnapshot = (phase: string) => {
	const boot = readPopupBootMark();
	const sinceDocMs = Math.round(performance.now());
	const sinceHtmlScriptMs =
		boot === undefined ? undefined : Math.round(performance.now() - boot.perfMs);

	return {
		phase,
		wallMs: Date.now(),
		sinceDocMs,
		sinceHtmlScriptMs,
		bootWallMs: boot?.wallMs,
	};
};
