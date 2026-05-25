import { describe, expect, it } from 'vitest';
import {
	parseCommaFormattedInteger,
	parsePlaysCount,
} from '@/layout/infrastructure/layouts/list/parse-formatted-count';

describe('parseCommaFormattedInteger', () => {
	it('parses comma-formatted integers', () => {
		expect(parseCommaFormattedInteger('1,269')).toBe(1269);
		expect(parseCommaFormattedInteger('27,565')).toBe(27565);
		expect(parseCommaFormattedInteger('0')).toBe(0);
	});

	it('returns undefined for malformed strings', () => {
		expect(parseCommaFormattedInteger('')).toBeUndefined();
		expect(parseCommaFormattedInteger('abc')).toBeUndefined();
		expect(parseCommaFormattedInteger('-1')).toBeUndefined();
		expect(parseCommaFormattedInteger('1.5')).toBe(1);
	});
});

describe('parsePlaysCount', () => {
	function createCard(html: string): Element {
		const card = document.createElement('li');
		card.className = 'soundList__item';
		card.innerHTML = html;
		return card;
	}

	it('parses plays from li title attribute', () => {
		const card = createCard(`
			<ul class="soundStats sc-ministats-group">
				<li title="27,565 plays" class="sc-ministats-item">
					<span class="sc-ministats sc-ministats-plays sc-text-secondary">
						<span class="sc-visuallyhidden">27,565 plays</span>
					</span>
				</li>
			</ul>
		`);
		expect(parsePlaysCount(card)).toBe(27565);
	});

	it('falls back to visually hidden text when title is missing', () => {
		const card = createCard(`
			<span class="sc-ministats sc-ministats-plays sc-text-secondary">
				<span class="sc-visuallyhidden">5,000 plays</span>
			</span>
		`);
		expect(parsePlaysCount(card)).toBe(5000);
	});

	it('returns undefined when plays stat is missing', () => {
		const card = createCard('<div>no stats</div>');
		expect(parsePlaysCount(card)).toBeUndefined();
	});
});
