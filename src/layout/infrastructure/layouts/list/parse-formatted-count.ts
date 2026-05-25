import { listFieldSelectors } from '@/layout/infrastructure/layouts/list/selectors';

/** Parse comma-formatted integer text; returns undefined when unparseable or negative. */
export function parseCommaFormattedInteger(text: string): number | undefined {
	const trimmed = text.trim();
	if (trimmed === '') return undefined;
	const withoutCommas = trimmed.replace(/,/g, '');
	const parsed = Number.parseInt(withoutCommas, 10);
	if (Number.isNaN(parsed) || parsed < 0) return undefined;
	return parsed;
}

/** Extract playback count from list card plays stat (title attribute or visually hidden text). */
export function parsePlaysCount(card: Element): number | undefined {
	const playsStat = card.querySelector(listFieldSelectors.trackPlaysStat);
	if (playsStat == null) return undefined;

	const item = playsStat.closest(listFieldSelectors.trackPlaysItem);
	const title = item?.getAttribute('title');
	if (title != null) {
		const titleMatch = /^([\d,]+)\s+plays$/i.exec(title.trim());
		if (titleMatch?.[1] != null) {
			const fromTitle = parseCommaFormattedInteger(titleMatch[1]);
			if (fromTitle !== undefined) return fromTitle;
		}
	}

	const hidden = playsStat.querySelector('.sc-visuallyhidden');
	const hiddenText = hidden?.textContent ?? '';
	const hiddenMatch = /([\d,]+)\s+plays/i.exec(hiddenText);
	if (hiddenMatch?.[1] != null) {
		return parseCommaFormattedInteger(hiddenMatch[1]);
	}

	return undefined;
}
