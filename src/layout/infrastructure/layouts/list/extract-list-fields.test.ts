import { describe, expect, it } from 'vitest';
import { loadFixtureText } from '@/common/tests/fixture-loaders';
import { extractListFields } from '@/layout/infrastructure/layouts/list/extract-list-fields';
import { trackCard } from '@/layout/infrastructure/layouts/list/selectors';
import { TRACK_LIST_CONTAINER } from '@/layout/infrastructure/selectors/shared';

function createCard(html: string): Element {
	const card = document.createElement('li');
	card.className = 'soundList__item';
	card.innerHTML = html;
	return card;
}

describe('extractListFields', () => {
	it('extracts genre and tags from tag content', () => {
		const card = createCard(`
			<a class="sc-tag soundTitle__tag sc-tag-small">
				<span class="sc-tagContent">Drum &amp; Bass</span>
			</a>
		`);
		expect(extractListFields(card)).toEqual({
			genre: 'Drum & Bass',
			tags: ['Drum & Bass'],
		});
	});

	it('extracts playback_count from plays stat title', () => {
		const card = createCard(`
			<ul>
				<li title="27,565 plays" class="sc-ministats-item">
					<span class="sc-ministats sc-ministats-plays"></span>
				</li>
			</ul>
		`);
		expect(extractListFields(card)).toEqual({ playback_count: 27565 });
	});

	it('extracts likes_count from like button label', () => {
		const card = createCard(`
			<button class="sc-button-like">
				<span class="sc-button-label">1,269</span>
			</button>
		`);
		expect(extractListFields(card)).toEqual({ likes_count: 1269 });
	});

	it('omits genre and tags when tag element is absent', () => {
		const card = createCard(`
			<button class="sc-button-like">
				<span class="sc-button-label">96</span>
			</button>
		`);
		const fields = extractListFields(card);
		expect(fields).toEqual({ likes_count: 96 });
		expect('genre' in fields).toBe(false);
		expect('tags' in fields).toBe(false);
	});

	it('omits unparseable likes_count while keeping other fields', () => {
		const card = createCard(`
			<a class="sc-tag soundTitle__tag"><span class="sc-tagContent">Bass</span></a>
			<ul>
				<li title="5,000 plays" class="sc-ministats-item">
					<span class="sc-ministats sc-ministats-plays"></span>
				</li>
			</ul>
			<button class="sc-button-like">
				<span class="sc-button-label">not-a-number</span>
			</button>
		`);
		expect(extractListFields(card)).toEqual({
			genre: 'Bass',
			tags: ['Bass'],
			playback_count: 5000,
		});
	});

	it('extracts all list fields from first list-view fixture card', () => {
		document.body.innerHTML = loadFixtureText('list-view.html');
		const root = document.querySelector(TRACK_LIST_CONTAINER);
		if (root == null) throw new Error('fixture root missing');
		const card = root.querySelector(trackCard);
		if (card == null) throw new Error('fixture card missing');

		expect(extractListFields(card)).toEqual({
			genre: 'Drum & Bass',
			tags: ['Drum & Bass'],
			playback_count: 27565,
			likes_count: 1269,
		});
	});
});
